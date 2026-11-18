// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { IERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StreamPay
 * @notice Non-custodial, fully-funded stablecoin payment streams.
 *
 * A sender escrows the entire stream amount up front. The recipient's balance then accrues
 * linearly with time and can be withdrawn whenever they choose. The contract never moves
 * tokens on a schedule, never takes a fee, and has no owner, admin, pause switch or upgrade
 * path. Deploying a new version requires deploying a new contract.
 *
 * Accrual is the source of truth:
 *   accrued(t) = amount * clamp(t - startTime, 0, duration) / duration
 *
 * The contract intentionally supports a single immutable ERC-20. That removes token-registry
 * admin risk and makes the solvency invariant easy to reason about:
 *   token.balanceOf(this) == sum(amount - withdrawn - refunded) over all streams.
 */
contract StreamPay is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* -------------------------------------------------------------------------- */
    /*                                   Types                                    */
    /* -------------------------------------------------------------------------- */

    enum Status {
        Active,
        Completed,
        Cancelled
    }

    struct Stream {
        address sender;
        address recipient;
        uint64 startTime;
        uint64 endTime;
        uint64 createdAt;
        uint64 cancelledAt;
        uint128 amount;
        uint128 withdrawn;
    }

    /// @dev A flattened, frontend-friendly representation returned by view functions.
    struct StreamView {
        uint256 id;
        address sender;
        address recipient;
        uint256 amount;
        uint256 withdrawn;
        uint256 accrued;
        uint256 withdrawable;
        uint64 startTime;
        uint64 endTime;
        uint64 createdAt;
        uint64 cancelledAt;
        Status status;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Constants                                 */
    /* -------------------------------------------------------------------------- */

    /// @notice Maximum number of streams settled in a single batch withdrawal.
    uint256 public constant MAX_BATCH = 50;

    /// @notice Maximum page size for the account stream views.
    uint256 public constant MAX_PAGE = 50;

    /* -------------------------------------------------------------------------- */
    /*                                   Storage                                  */
    /* -------------------------------------------------------------------------- */

    IERC20 public immutable token;
    uint8 public immutable tokenDecimals;

    uint256 public streamCount;

    mapping(uint256 id => Stream) private _streams;
    mapping(address account => uint256[] ids) private _senderStreamIds;
    mapping(address account => uint256[] ids) private _recipientStreamIds;

    /* -------------------------------------------------------------------------- */
    /*                                   Events                                   */
    /* -------------------------------------------------------------------------- */

    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint64 startTime,
        uint64 endTime
    );

    event Withdrawal(uint256 indexed streamId, address indexed recipient, uint256 amount);

    event StreamCancelled(
        uint256 indexed streamId,
        address indexed cancelledBy,
        uint256 senderRefund,
        uint256 recipientWithdrawable,
        uint64 cancelledAt
    );

    /* -------------------------------------------------------------------------- */
    /*                                   Errors                                   */
    /* -------------------------------------------------------------------------- */

    error InvalidToken();
    error UnsupportedDecimals(uint8 decimals);
    error InvalidRecipient();
    error SelfStream();
    error ZeroAmount();
    error AmountTooLarge(uint256 amount);
    error StartTimeInPast(uint64 startTime, uint64 now_);
    error InvalidDuration(uint64 startTime, uint64 endTime);
    error InsufficientAllowance(uint256 allowance, uint256 required);
    error UnexpectedTransferAmount(uint256 expected, uint256 received);
    error StreamNotFound(uint256 streamId);
    error NotRecipient(uint256 streamId, address caller);
    error NotStreamParty(uint256 streamId, address caller);
    error StreamAlreadyEnded(uint256 streamId);
    error StreamAlreadyCancelled(uint256 streamId);
    error NothingToWithdraw();
    error EmptyBatch();
    error BatchTooLarge(uint256 length, uint256 max);
    error InvalidPage(uint256 limit);

    /* -------------------------------------------------------------------------- */
    /*                                Construction                                */
    /* -------------------------------------------------------------------------- */

    constructor(IERC20 token_) {
        if (address(token_) == address(0)) revert InvalidToken();

        uint8 decimals_ = IERC20Metadata(address(token_)).decimals();
        if (decimals_ > 18) revert UnsupportedDecimals(decimals_);

        token = token_;
        tokenDecimals = decimals_;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Creating                                  */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Create and fully fund a new stream.
     * @param recipient  Address that earns the streamed balance.
     * @param amount     Total amount to escrow, in token base units.
     * @param startTime  Unix timestamp when accrual begins. Pass 0 to start immediately.
     * @param endTime    Unix timestamp when the full amount has accrued.
     * @return streamId  Identifier of the newly created stream.
     *
     * Requirements:
     * - `amount` must be non-zero and fit in uint128.
     * - `recipient` must be non-zero and distinct from the sender.
     * - `startTime` must be 0 or at/after the current block timestamp.
     * - `endTime` must be strictly after `startTime`.
     * - The caller must have approved at least `amount` to this contract.
     * - The token must transfer exactly `amount` (fee-on-transfer tokens are rejected).
     */
    function createStream(address recipient, uint256 amount, uint64 startTime, uint64 endTime)
        external
        nonReentrant
        returns (uint256 streamId)
    {
        streamId = _createStream(msg.sender, recipient, amount, startTime, endTime);
    }

    /**
     * @notice Create and fund a stream using an EIP-2612 permit, so the sender needs one
     * signature and one transaction instead of an approve transaction.
     *
     * @dev The permit call is best-effort: if it fails because the signature was already
     * submitted by someone else (front-run), expired, or the token does not implement
     * EIP-2612, execution continues and the normal allowance check in `_createStream`
     * still applies. A failed permit can never bypass the funding requirement.
     */
    function createStreamWithPermit(
        address recipient,
        uint256 amount,
        uint64 startTime,
        uint64 endTime,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant returns (uint256 streamId) {
        try IERC20Permit(address(token))
            .permit(msg.sender, address(this), amount, deadline, v, r, s) { }
            catch { }

        streamId = _createStream(msg.sender, recipient, amount, startTime, endTime);
    }

    function _createStream(
        address sender,
        address recipient,
        uint256 amount,
        uint64 startTime,
        uint64 endTime
    ) private returns (uint256 streamId) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (recipient == sender) revert SelfStream();
        if (amount == 0) revert ZeroAmount();
        if (amount > type(uint128).max) revert AmountTooLarge(amount);

        uint64 now_ = uint64(block.timestamp);
        uint64 resolvedStart = startTime == 0 ? now_ : startTime;
        if (resolvedStart < now_) revert StartTimeInPast(resolvedStart, now_);
        if (endTime <= resolvedStart) revert InvalidDuration(resolvedStart, endTime);

        uint256 allowance = token.allowance(sender, address(this));
        if (allowance < amount) revert InsufficientAllowance(allowance, amount);

        // Measure the actual amount received so that fee-on-transfer tokens cannot create
        // an under-collateralized stream.
        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(sender, address(this), amount);
        uint256 received = token.balanceOf(address(this)) - balanceBefore;
        if (received != amount) revert UnexpectedTransferAmount(amount, received);

        streamId = ++streamCount;

        _streams[streamId] = Stream({
            sender: sender,
            recipient: recipient,
            startTime: resolvedStart,
            endTime: endTime,
            createdAt: now_,
            cancelledAt: 0,
            amount: uint128(amount),
            withdrawn: 0
        });

        _senderStreamIds[sender].push(streamId);
        _recipientStreamIds[recipient].push(streamId);

        emit StreamCreated(streamId, sender, recipient, amount, resolvedStart, endTime);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Withdrawing                                */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Withdraw the recipient's currently accrued, not-yet-withdrawn balance.
     * @dev Only the recipient can withdraw, and only to their own address. Calling this
     * before any amount accrues reverts with `NothingToWithdraw`.
     */
    function withdraw(uint256 streamId) external nonReentrant returns (uint256 amount) {
        amount = _withdraw(streamId, msg.sender);
    }

    /**
     * @notice Withdraw from several streams in one transaction. Streams with nothing
     * available are skipped. Duplicate ids are harmless.
     */
    function withdrawMany(uint256[] calldata streamIds)
        external
        nonReentrant
        returns (uint256 total)
    {
        uint256 length = streamIds.length;
        if (length == 0) revert EmptyBatch();
        if (length > MAX_BATCH) revert BatchTooLarge(length, MAX_BATCH);

        for (uint256 i = 0; i < length; ++i) {
            uint256 id = streamIds[i];
            Stream storage stream = _streams[id];
            if (stream.sender == address(0)) revert StreamNotFound(id);
            if (stream.recipient != msg.sender) revert NotRecipient(id, msg.sender);

            uint256 amount = _withdrawableAt(stream, block.timestamp);
            if (amount == 0) continue;

            stream.withdrawn = uint128(uint256(stream.withdrawn) + amount);
            total += amount;

            emit Withdrawal(id, msg.sender, amount);
        }

        if (total == 0) revert NothingToWithdraw();
        token.safeTransfer(msg.sender, total);
    }

    function _withdraw(uint256 streamId, address caller) private returns (uint256 amount) {
        Stream storage stream = _streams[streamId];
        if (stream.sender == address(0)) revert StreamNotFound(streamId);
        if (stream.recipient != caller) revert NotRecipient(streamId, caller);

        amount = _withdrawableAt(stream, block.timestamp);
        if (amount == 0) revert NothingToWithdraw();

        // State is updated before the external transfer (checks-effects-interactions).
        stream.withdrawn = uint128(uint256(stream.withdrawn) + amount);

        emit Withdrawal(streamId, caller, amount);
        token.safeTransfer(caller, amount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Cancelling                                */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Cancel an active stream. Either party may cancel.
     *
     * Accrual stops at the cancellation timestamp:
     * - the sender immediately receives the unaccrued remainder,
     * - the recipient keeps everything accrued so far and can withdraw it at any time.
     *
     * Cancelling a stream that has already reached its end time is not allowed; the full
     * amount has accrued and the recipient simply withdraws.
     */
    function cancelStream(uint256 streamId) external nonReentrant {
        Stream storage stream = _streams[streamId];
        if (stream.sender == address(0)) revert StreamNotFound(streamId);
        if (msg.sender != stream.sender && msg.sender != stream.recipient) {
            revert NotStreamParty(streamId, msg.sender);
        }
        if (stream.cancelledAt != 0) revert StreamAlreadyCancelled(streamId);

        uint64 now_ = uint64(block.timestamp);
        if (now_ >= stream.endTime) revert StreamAlreadyEnded(streamId);

        uint256 accrued = _accruedAt(stream, now_);
        uint256 refund = uint256(stream.amount) - accrued;
        uint256 recipientWithdrawable = accrued - stream.withdrawn;

        stream.cancelledAt = now_;

        emit StreamCancelled(streamId, msg.sender, refund, recipientWithdrawable, now_);

        if (refund != 0) token.safeTransfer(stream.sender, refund);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Views                                   */
    /* -------------------------------------------------------------------------- */

    /// @notice Full state and live accounting for one stream.
    function getStream(uint256 streamId) external view returns (StreamView memory) {
        if (_streams[streamId].sender == address(0)) revert StreamNotFound(streamId);
        return _toView(streamId);
    }

    /// @notice Total amount accrued so far, including already-withdrawn amounts.
    function accruedOf(uint256 streamId) external view returns (uint256) {
        Stream storage stream = _streams[streamId];
        if (stream.sender == address(0)) revert StreamNotFound(streamId);
        return _accruedAt(stream, block.timestamp);
    }

    /// @notice Amount the recipient could withdraw right now.
    function withdrawableOf(uint256 streamId) external view returns (uint256) {
        Stream storage stream = _streams[streamId];
        if (stream.sender == address(0)) revert StreamNotFound(streamId);
        return _withdrawableAt(stream, block.timestamp);
    }

    /// @notice Number of streams created by an account.
    function senderStreamCount(address account) external view returns (uint256) {
        return _senderStreamIds[account].length;
    }

    /// @notice Number of streams received by an account.
    function recipientStreamCount(address account) external view returns (uint256) {
        return _recipientStreamIds[account].length;
    }

    /**
     * @notice Page through streams created by an account, newest first.
     * @dev Newest-first ordering keeps the dashboard's first page relevant without an indexer.
     */
    function getSenderStreams(address account, uint256 offset, uint256 limit)
        external
        view
        returns (StreamView[] memory)
    {
        return _page(_senderStreamIds[account], offset, limit, true);
    }

    /**
     * @notice Page through streams received by an account, newest first.
     */
    function getRecipientStreams(address account, uint256 offset, uint256 limit)
        external
        view
        returns (StreamView[] memory)
    {
        return _page(_recipientStreamIds[account], offset, limit, true);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Internals                                 */
    /* -------------------------------------------------------------------------- */

    /// @dev Linear accrual, clamped to [startTime, endTime] and frozen on cancellation.
    function _accruedAt(Stream storage stream, uint256 timestamp) private view returns (uint256) {
        uint256 effective = timestamp;

        uint64 cancelledAt = stream.cancelledAt;
        if (cancelledAt != 0 && cancelledAt < effective) {
            effective = cancelledAt;
        }

        uint64 startTime = stream.startTime;
        if (effective <= startTime) return 0;

        uint64 endTime = stream.endTime;
        if (effective >= endTime) return stream.amount;

        // amount <= uint128.max and elapsed <= uint64.max, so the product fits in uint256.
        return (uint256(stream.amount) * (effective - startTime)) / (endTime - startTime);
    }

    function _withdrawableAt(Stream storage stream, uint256 timestamp)
        private
        view
        returns (uint256)
    {
        uint256 accrued = _accruedAt(stream, timestamp);
        uint256 withdrawn = stream.withdrawn;
        return accrued > withdrawn ? accrued - withdrawn : 0;
    }

    function _toView(uint256 streamId) private view returns (StreamView memory view_) {
        Stream storage stream = _streams[streamId];
        uint256 accrued = _accruedAt(stream, block.timestamp);
        uint256 withdrawn = stream.withdrawn;

        Status status;
        if (stream.cancelledAt != 0) {
            status = Status.Cancelled;
        } else if (block.timestamp >= stream.endTime) {
            status = Status.Completed;
        } else {
            status = Status.Active;
        }

        view_ = StreamView({
            id: streamId,
            sender: stream.sender,
            recipient: stream.recipient,
            amount: stream.amount,
            withdrawn: withdrawn,
            accrued: accrued,
            withdrawable: accrued > withdrawn ? accrued - withdrawn : 0,
            startTime: stream.startTime,
            endTime: stream.endTime,
            createdAt: stream.createdAt,
            cancelledAt: stream.cancelledAt,
            status: status
        });
    }

    function _page(uint256[] storage ids, uint256 offset, uint256 limit, bool newestFirst)
        private
        view
        returns (StreamView[] memory views)
    {
        if (limit == 0 || limit > MAX_PAGE) revert InvalidPage(limit);

        uint256 total = ids.length;
        if (offset >= total) return new StreamView[](0);

        uint256 available = total - offset;
        uint256 count = available < limit ? available : limit;

        views = new StreamView[](count);
        for (uint256 i = 0; i < count; ++i) {
            uint256 index = newestFirst ? total - 1 - offset - i : offset + i;
            views[i] = _toView(ids[index]);
        }
    }
}
