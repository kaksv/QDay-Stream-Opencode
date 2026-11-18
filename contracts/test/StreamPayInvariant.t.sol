// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { StreamPay } from "../src/StreamPay.sol";
import { MockTUSD8 } from "../src/mocks/MockTUSD8.sol";

/**
 * @notice Randomized actor that only performs valid, protocol-supported actions. Its ghost
 * totals let the invariant suite compare the contract's token balance with its obligations.
 */
contract StreamPayHandler is Test {
    StreamPay public immutable streamPay;
    MockTUSD8 public immutable token;
    address[] public actors;
    uint256[] public streamIds;

    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    uint256 public totalRefunded;

    constructor(StreamPay streamPay_, MockTUSD8 token_) {
        streamPay = streamPay_;
        token = token_;

        for (uint256 i = 0; i < 3; ++i) {
            address actor = makeAddr(string(abi.encodePacked("actor", i)));
            actors.push(actor);
            token.mint(actor, 1e30);
            vm.prank(actor);
            token.approve(address(streamPay), type(uint256).max);
        }
    }

    function actorCount() external view returns (uint256) {
        return actors.length;
    }

    function streamCount() external view returns (uint256) {
        return streamIds.length;
    }

    function create(uint256 actorSeed, uint256 recipientSeed, uint128 amount, uint32 duration)
        external
    {
        if (streamIds.length >= 40) return;
        address actor = actors[actorSeed % actors.length];
        address recipient = actors[recipientSeed % actors.length];
        if (recipient == actor) recipient = actor == actors[0] ? actors[1] : actors[0];

        uint256 boundedAmount = bound(amount, 1, 1_000_000e6);
        uint32 boundedDuration = uint32(bound(duration, 1, 365 days));

        vm.prank(actor);
        uint256 id = streamPay.createStream(
            recipient, boundedAmount, 0, uint64(block.timestamp + boundedDuration)
        );

        streamIds.push(id);
        totalDeposited += boundedAmount;
    }

    function warp(uint32 delta) external {
        vm.warp(block.timestamp + bound(delta, 0, 1 days));
    }

    function withdraw(uint256 seed) external {
        if (streamIds.length == 0) return;
        uint256 id = streamIds[seed % streamIds.length];

        StreamPay.StreamView memory view_ = streamPay.getStream(id);
        if (view_.withdrawable == 0) return;

        vm.prank(view_.recipient);
        uint256 amount = streamPay.withdraw(id);
        totalWithdrawn += amount;
    }

    function cancel(uint256 seed) external {
        if (streamIds.length == 0) return;
        uint256 id = streamIds[seed % streamIds.length];

        StreamPay.StreamView memory view_ = streamPay.getStream(id);
        if (view_.status != StreamPay.Status.Active) return;
        if (block.timestamp >= view_.endTime) return;

        uint256 refund = view_.amount - view_.accrued;

        vm.prank(view_.sender);
        streamPay.cancelStream(id);
        totalRefunded += refund;
    }

    function withdrawMany(uint256 seedA, uint256 seedB) external {
        if (streamIds.length == 0) return;

        uint256 idA = streamIds[seedA % streamIds.length];
        uint256 idB = streamIds[seedB % streamIds.length];
        StreamPay.StreamView memory viewA = streamPay.getStream(idA);
        StreamPay.StreamView memory viewB = streamPay.getStream(idB);

        if (viewA.recipient != viewB.recipient) return;
        if (viewA.withdrawable == 0 && viewB.withdrawable == 0) return;

        uint256[] memory ids = new uint256[](2);
        ids[0] = idA;
        ids[1] = idB;

        vm.prank(viewA.recipient);
        uint256 amount = streamPay.withdrawMany(ids);
        totalWithdrawn += amount;
    }
}

contract StreamPayInvariantTest is Test {
    StreamPay internal streamPay;
    MockTUSD8 internal token;
    StreamPayHandler internal handler;

    function setUp() public {
        vm.warp(1_800_000_000);

        token = new MockTUSD8();
        streamPay = new StreamPay(IERC20(address(token)));
        handler = new StreamPayHandler(streamPay, token);

        targetContract(address(handler));
    }

    /// @notice The contract must always hold exactly the sum of its outstanding obligations.
    function invariant_ContractBalanceMatchesObligations() public view {
        uint256 expected =
            handler.totalDeposited() - handler.totalWithdrawn() - handler.totalRefunded();
        assertEq(token.balanceOf(address(streamPay)), expected);
    }

    /// @notice Per-stream accounting must reconcile with the escrow balance.
    function invariant_StreamAccountingReconciles() public view {
        uint256 totalEscrow;
        uint256 count = streamPay.streamCount();

        for (uint256 id = 1; id <= count; ++id) {
            StreamPay.StreamView memory view_ = streamPay.getStream(id);

            assertLe(view_.withdrawn, view_.accrued, "withdrawn exceeds accrued");
            assertLe(view_.accrued, view_.amount, "accrued exceeds deposit");
            assertEq(view_.withdrawable, view_.accrued - view_.withdrawn, "bad withdrawable");

            uint256 escrow = view_.amount - view_.withdrawn;
            if (view_.status == StreamPay.Status.Cancelled) {
                uint256 refunded = view_.amount - view_.accrued;
                escrow -= refunded;
                assertEq(view_.cancelledAt > 0, true, "cancelled without timestamp");
            } else if (view_.status == StreamPay.Status.Completed) {
                assertEq(view_.accrued, view_.amount, "completed but not fully accrued");
            }

            totalEscrow += escrow;
        }

        assertEq(token.balanceOf(address(streamPay)), totalEscrow, "escrow mismatch");
    }

    /// @notice Recipient cannot withdraw more than accrued across arbitrary action sequences.
    function invariant_RecipientWithdrawalsAreBounded() public view {
        assertLe(handler.totalWithdrawn(), handler.totalDeposited());
    }
}
