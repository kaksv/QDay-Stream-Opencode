// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Test } from "forge-std/Test.sol";

import { StreamPay } from "../src/StreamPay.sol";
import { StreamPayTestBase } from "./StreamPayBase.t.sol";
import {
    FeeOnTransferToken,
    HighDecimalsToken,
    ReentrantToken
} from "./mocks/AdversarialTokens.sol";

/* -------------------------------------------------------------------------- */
/*                                Construction                                */
/* -------------------------------------------------------------------------- */

contract StreamPayConstructionTest is StreamPayTestBase {
    function test_StoresTokenMetadata() public view {
        assertEq(address(streamPay.token()), address(token));
        assertEq(streamPay.tokenDecimals(), 6);
        assertEq(streamPay.streamCount(), 0);
        assertEq(streamPay.MAX_BATCH(), 50);
        assertEq(streamPay.MAX_PAGE(), 50);
    }

    function test_RevertWhen_TokenIsZeroAddress() public {
        vm.expectRevert(StreamPay.InvalidToken.selector);
        new StreamPay(IERC20(address(0)));
    }

    function test_RevertWhen_TokenHasMoreThan18Decimals() public {
        HighDecimalsToken high = new HighDecimalsToken();
        vm.expectRevert(abi.encodeWithSelector(StreamPay.UnsupportedDecimals.selector, 19));
        new StreamPay(IERC20(address(high)));
    }
}

/* -------------------------------------------------------------------------- */
/*                                  Creating                                  */
/* -------------------------------------------------------------------------- */

contract StreamPayCreateTest is StreamPayTestBase {
    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint64 startTime,
        uint64 endTime
    );

    function test_CreateStreamFundsEscrowAndStoresState() public {
        uint256 senderBalanceBefore = token.balanceOf(sender);

        vm.expectEmit(true, true, true, true, address(streamPay));
        emit StreamCreated(1, sender, recipient, AMOUNT, uint64(START), uint64(START) + DURATION);

        uint256 id = _createDefault();

        assertEq(id, 1);
        assertEq(streamPay.streamCount(), 1);
        assertEq(token.balanceOf(address(streamPay)), AMOUNT);
        assertEq(token.balanceOf(sender), senderBalanceBefore - AMOUNT);
        // OpenZeppelin keeps an infinite approval untouched.
        assertEq(token.allowance(sender, address(streamPay)), type(uint256).max);

        StreamPay.StreamView memory view_ = streamPay.getStream(id);
        assertEq(view_.id, id);
        assertEq(view_.sender, sender);
        assertEq(view_.recipient, recipient);
        assertEq(view_.amount, AMOUNT);
        assertEq(view_.withdrawn, 0);
        assertEq(view_.accrued, 0);
        assertEq(view_.withdrawable, 0);
        assertEq(view_.startTime, START);
        assertEq(view_.endTime, START + DURATION);
        assertEq(view_.createdAt, START);
        assertEq(view_.cancelledAt, 0);
        assertEq(uint256(view_.status), uint256(StreamPay.Status.Active));

        assertEq(streamPay.senderStreamCount(sender), 1);
        assertEq(streamPay.recipientStreamCount(recipient), 1);
    }

    function test_ExactApprovalIsFullyConsumed() public {
        address exactSender = makeAddr("exactSender");
        token.mint(exactSender, AMOUNT);

        vm.startPrank(exactSender);
        token.approve(address(streamPay), AMOUNT);
        streamPay.createStream(recipient, AMOUNT, 0, uint64(START + DURATION));
        vm.stopPrank();

        // No residual allowance remains for a later transaction to exploit.
        assertEq(token.allowance(exactSender, address(streamPay)), 0);
    }

    function test_ImmediateStartUsesBlockTimestamp() public {
        vm.warp(START + 40);
        vm.prank(sender);
        uint256 id = streamPay.createStream(recipient, AMOUNT, 0, uint64(START + 40 + DURATION));

        StreamPay.StreamView memory view_ = streamPay.getStream(id);
        assertEq(view_.startTime, START + 40);
        assertEq(view_.endTime, START + 40 + DURATION);
    }

    function test_ScheduledStreamDoesNotAccrueBeforeStart() public {
        uint64 start = uint64(START + 100);
        uint64 end = start + DURATION;
        uint256 id = _createScheduled(start, end);

        assertEq(streamPay.accruedOf(id), 0);
        assertEq(streamPay.withdrawableOf(id), 0);

        vm.warp(start - 1);
        assertEq(streamPay.accruedOf(id), 0);

        vm.warp(start);
        assertEq(streamPay.accruedOf(id), 0);
    }

    function test_ManyIndependentStreamsCanCoexist() public {
        address secondRecipient = makeAddr("secondRecipient");
        uint256 first = _createDefault();

        vm.prank(sender);
        uint256 second = streamPay.createStream(secondRecipient, 250e6, 0, uint64(START + 500));

        vm.prank(sender);
        uint256 third =
            streamPay.createStream(recipient, 10e6, uint64(START + 50), uint64(START + 60));

        assertEq(first, 1);
        assertEq(second, 2);
        assertEq(third, 3);
        assertEq(streamPay.streamCount(), 3);
        assertEq(token.balanceOf(address(streamPay)), AMOUNT + 250e6 + 10e6);

        assertEq(streamPay.senderStreamCount(sender), 3);
        assertEq(streamPay.recipientStreamCount(recipient), 2);
        assertEq(streamPay.recipientStreamCount(secondRecipient), 1);

        vm.warp(START + 30);
        assertEq(streamPay.accruedOf(first), 30e6);
        assertEq(streamPay.accruedOf(second), 15e6);
        assertEq(streamPay.accruedOf(third), 0);
    }

    function test_RevertWhen_RecipientIsZero() public {
        vm.prank(sender);
        vm.expectRevert(StreamPay.InvalidRecipient.selector);
        streamPay.createStream(address(0), AMOUNT, 0, uint64(START + DURATION));
    }

    function test_RevertWhen_RecipientIsSender() public {
        vm.prank(sender);
        vm.expectRevert(StreamPay.SelfStream.selector);
        streamPay.createStream(sender, AMOUNT, 0, uint64(START + DURATION));
    }

    function test_RevertWhen_AmountIsZero() public {
        vm.prank(sender);
        vm.expectRevert(StreamPay.ZeroAmount.selector);
        streamPay.createStream(recipient, 0, 0, uint64(START + DURATION));
    }

    function test_RevertWhen_AmountExceedsUint128() public {
        uint256 tooLarge = uint256(type(uint128).max) + 1;
        vm.prank(sender);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.AmountTooLarge.selector, tooLarge));
        streamPay.createStream(recipient, tooLarge, 0, uint64(START + DURATION));
    }

    function test_RevertWhen_StartTimeIsInThePast() public {
        uint64 past = uint64(START - 1);
        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(StreamPay.StartTimeInPast.selector, past, uint64(START))
        );
        streamPay.createStream(recipient, AMOUNT, past, uint64(START + DURATION));
    }

    function test_RevertWhen_EndEqualsStart() public {
        uint64 end = uint64(START + DURATION);
        vm.prank(sender);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.InvalidDuration.selector, end, end));
        streamPay.createStream(recipient, AMOUNT, end, end);
    }

    function test_RevertWhen_EndBeforeStart() public {
        uint64 start = uint64(START + 100);
        uint64 end = uint64(START + 50);
        vm.prank(sender);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.InvalidDuration.selector, start, end));
        streamPay.createStream(recipient, AMOUNT, start, end);
    }

    function test_RevertWhen_AllowanceIsInsufficient() public {
        address unapproved = makeAddr("unapproved");
        token.mint(unapproved, AMOUNT);

        vm.prank(unapproved);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.InsufficientAllowance.selector, 0, AMOUNT));
        streamPay.createStream(recipient, AMOUNT, 0, uint64(START + DURATION));
    }

    function test_RevertWhen_TokenChargesTransferFee() public {
        FeeOnTransferToken feeToken = new FeeOnTransferToken();
        StreamPay feeStreamPay = new StreamPay(IERC20(address(feeToken)));
        address feeSender = makeAddr("feeSender");

        feeToken.mint(feeSender, AMOUNT);
        vm.prank(feeSender);
        feeToken.approve(address(feeStreamPay), AMOUNT);

        uint256 expectedReceived = AMOUNT - (AMOUNT * feeToken.FEE_BPS()) / 10_000;

        vm.prank(feeSender);
        vm.expectRevert(
            abi.encodeWithSelector(
                StreamPay.UnexpectedTransferAmount.selector, AMOUNT, expectedReceived
            )
        );
        feeStreamPay.createStream(recipient, AMOUNT, 0, uint64(START + DURATION));

        assertEq(feeStreamPay.streamCount(), 0);
        assertEq(feeToken.balanceOf(address(feeStreamPay)), 0);
    }

    function test_CreateRevertsAtomicallyWhenTokenTransferFails() public {
        address broke = makeAddr("broke");
        vm.prank(broke);
        token.approve(address(streamPay), AMOUNT);

        vm.prank(broke);
        vm.expectRevert();
        streamPay.createStream(recipient, AMOUNT, 0, uint64(START + DURATION));

        assertEq(streamPay.streamCount(), 0);
        assertEq(streamPay.senderStreamCount(broke), 0);
        assertEq(streamPay.recipientStreamCount(recipient), 0);
    }
}

/* -------------------------------------------------------------------------- */
/*                                  Accrual                                   */
/* -------------------------------------------------------------------------- */

contract StreamPayAccrualTest is StreamPayTestBase {
    function test_AccrualIsZeroBeforeStart() public {
        uint64 start = uint64(START + 100);
        uint256 id = _createScheduled(start, start + DURATION);

        assertEq(streamPay.accruedOf(id), 0);
        vm.warp(start - 1);
        assertEq(streamPay.accruedOf(id), 0);
    }

    function test_AccrualIsLinear() public {
        uint256 id = _createDefault();

        vm.warp(START + 1);
        assertEq(streamPay.accruedOf(id), 1e6); // 0.1%

        vm.warp(START + 250);
        assertEq(streamPay.accruedOf(id), 250e6); // 25%

        vm.warp(START + 500);
        assertEq(streamPay.accruedOf(id), 500e6); // 50%

        vm.warp(START + 999);
        assertEq(streamPay.accruedOf(id), 999e6); // 99.9%
    }

    function test_AccrualCapsAtAmountAtEndAndAfter() public {
        uint256 id = _createDefault();

        vm.warp(START + DURATION);
        assertEq(streamPay.accruedOf(id), AMOUNT);

        vm.warp(START + DURATION + 10_000);
        assertEq(streamPay.accruedOf(id), AMOUNT);
        assertEq(uint256(streamPay.getStream(id).status), uint256(StreamPay.Status.Completed));
    }

    function test_AccrualRoundsDownAndNeverExceedsAmount() public {
        vm.prank(sender);
        uint256 id = streamPay.createStream(recipient, 10, 0, uint64(START + 3));

        vm.warp(START + 1);
        assertEq(streamPay.accruedOf(id), 3);
        vm.warp(START + 2);
        assertEq(streamPay.accruedOf(id), 6);
        vm.warp(START + 3);
        assertEq(streamPay.accruedOf(id), 10);
        vm.warp(START + 100);
        assertEq(streamPay.accruedOf(id), 10);
    }

    function testFuzz_AccrualIsBounded(uint128 amount, uint32 duration, uint32 elapsed) public {
        vm.assume(amount > 0);
        vm.assume(amount <= 1_000_000e6);
        vm.assume(duration > 0);

        vm.prank(sender);
        uint256 id = streamPay.createStream(recipient, amount, 0, uint64(START + duration));

        vm.warp(START + elapsed);
        uint256 accrued = streamPay.accruedOf(id);

        assertLe(accrued, amount);
        if (elapsed == 0) assertEq(accrued, 0);
        if (elapsed >= duration) assertEq(accrued, amount);
    }
}

/* -------------------------------------------------------------------------- */
/*                                 Withdrawing                                */
/* -------------------------------------------------------------------------- */

contract StreamPayWithdrawTest is StreamPayTestBase {
    event Withdrawal(uint256 indexed streamId, address indexed recipient, uint256 amount);

    function test_WithdrawPartial() public {
        uint256 id = _createDefault();
        vm.warp(START + 250);

        vm.expectEmit(true, true, true, true, address(streamPay));
        emit Withdrawal(id, recipient, 250e6);

        vm.prank(recipient);
        uint256 withdrawn = streamPay.withdraw(id);

        assertEq(withdrawn, 250e6);
        assertEq(token.balanceOf(recipient), 250e6);

        StreamPay.StreamView memory view_ = streamPay.getStream(id);
        assertEq(view_.withdrawn, 250e6);
        assertEq(view_.accrued, 250e6);
        assertEq(view_.withdrawable, 0);
        assertEq(view_.amount, AMOUNT);
    }

    function test_WithdrawMultipleTimesAsTimePasses() public {
        uint256 id = _createDefault();

        vm.warp(START + 250);
        vm.prank(recipient);
        assertEq(streamPay.withdraw(id), 250e6);

        vm.warp(START + 500);
        vm.prank(recipient);
        assertEq(streamPay.withdraw(id), 250e6);

        assertEq(token.balanceOf(recipient), 500e6);
        assertEq(streamPay.getStream(id).withdrawn, 500e6);
    }

    function test_WithdrawEverythingAtEnd() public {
        uint256 id = _createDefault();
        vm.warp(START + DURATION);

        vm.prank(recipient);
        assertEq(streamPay.withdraw(id), AMOUNT);

        assertEq(token.balanceOf(recipient), AMOUNT);
        assertEq(token.balanceOf(address(streamPay)), 0);
        assertEq(streamPay.getStream(id).withdrawable, 0);
        assertEq(uint256(streamPay.getStream(id).status), uint256(StreamPay.Status.Completed));
    }

    function test_RevertWhen_NothingAccruedYet() public {
        uint64 start = uint64(START + 100);
        uint256 id = _createScheduled(start, start + DURATION);

        vm.prank(recipient);
        vm.expectRevert(StreamPay.NothingToWithdraw.selector);
        streamPay.withdraw(id);
    }

    function test_RevertWhen_AlreadyWithdrawn() public {
        uint256 id = _createDefault();
        vm.warp(START + DURATION);

        vm.prank(recipient);
        streamPay.withdraw(id);

        vm.prank(recipient);
        vm.expectRevert(StreamPay.NothingToWithdraw.selector);
        streamPay.withdraw(id);
    }

    function test_RevertWhen_CallerIsNotRecipient() public {
        uint256 id = _createDefault();
        vm.warp(START + 250);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.NotRecipient.selector, id, stranger));
        streamPay.withdraw(id);

        vm.prank(sender);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.NotRecipient.selector, id, sender));
        streamPay.withdraw(id);
    }

    function test_RevertWhen_StreamDoesNotExist() public {
        vm.prank(recipient);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.StreamNotFound.selector, 999));
        streamPay.withdraw(999);
    }

    function test_RecipientCannotWithdrawMoreThanAccrued() public {
        uint256 id = _createDefault();
        vm.warp(START + 100);

        vm.prank(recipient);
        streamPay.withdraw(id);

        // No time has passed since the last withdrawal.
        vm.prank(recipient);
        vm.expectRevert(StreamPay.NothingToWithdraw.selector);
        streamPay.withdraw(id);

        assertEq(token.balanceOf(recipient), 100e6);
        assertLe(streamPay.getStream(id).withdrawn, streamPay.getStream(id).accrued);
    }

    function test_WithdrawManyStreams() public {
        uint256 first = _createDefault();
        uint256 second = _createDefault();
        uint256 third = _createDefault();

        vm.warp(START + 500);

        uint256[] memory ids = new uint256[](3);
        ids[0] = first;
        ids[1] = second;
        ids[2] = third;

        vm.prank(recipient);
        uint256 total = streamPay.withdrawMany(ids);

        assertEq(total, 1_500e6);
        assertEq(token.balanceOf(recipient), 1_500e6);

        for (uint256 i = 0; i < ids.length; ++i) {
            assertEq(streamPay.getStream(ids[i]).withdrawn, 500e6);
            assertEq(streamPay.getStream(ids[i]).withdrawable, 0);
        }
    }

    function test_WithdrawManySkipsStreamsWithNothingAvailable() public {
        uint256 active = _createDefault();
        uint64 futureStart = uint64(START + 1_000);
        uint256 scheduled = _createScheduled(futureStart, futureStart + DURATION);

        vm.warp(START + 100);

        uint256[] memory ids = new uint256[](2);
        ids[0] = scheduled;
        ids[1] = active;

        vm.prank(recipient);
        uint256 total = streamPay.withdrawMany(ids);

        assertEq(total, 100e6);
        assertEq(streamPay.getStream(active).withdrawn, 100e6);
        assertEq(streamPay.getStream(scheduled).withdrawn, 0);
    }

    function test_WithdrawManyIgnoresDuplicateIds() public {
        uint256 id = _createDefault();
        vm.warp(START + 100);

        uint256[] memory ids = new uint256[](2);
        ids[0] = id;
        ids[1] = id;

        vm.prank(recipient);
        uint256 total = streamPay.withdrawMany(ids);

        assertEq(total, 100e6);
        assertEq(token.balanceOf(recipient), 100e6);
        assertEq(streamPay.getStream(id).withdrawn, 100e6);
    }

    function test_RevertWhen_BatchIsEmpty() public {
        vm.prank(recipient);
        vm.expectRevert(StreamPay.EmptyBatch.selector);
        streamPay.withdrawMany(new uint256[](0));
    }

    function test_RevertWhen_BatchIsTooLarge() public {
        uint256[] memory ids = new uint256[](51);
        vm.prank(recipient);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.BatchTooLarge.selector, 51, 50));
        streamPay.withdrawMany(ids);
    }

    function test_RevertWhen_BatchContainsSomeoneElsesStream() public {
        uint256 mine = _createDefault();
        vm.warp(START + 100);

        uint256[] memory ids = new uint256[](2);
        ids[0] = mine;
        ids[1] = 999;

        vm.prank(recipient);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.StreamNotFound.selector, 999));
        streamPay.withdrawMany(ids);
    }

    function test_RevertWhen_BatchHasNothingToWithdraw() public {
        uint256 id = _createDefault();
        uint256[] memory ids = new uint256[](1);
        ids[0] = id;

        vm.prank(recipient);
        vm.expectRevert(StreamPay.NothingToWithdraw.selector);
        streamPay.withdrawMany(ids);
    }
}

/* -------------------------------------------------------------------------- */
/*                                  Cancelling                                */
/* -------------------------------------------------------------------------- */

contract StreamPayCancelTest is StreamPayTestBase {
    event StreamCancelled(
        uint256 indexed streamId,
        address indexed cancelledBy,
        uint256 senderRefund,
        uint256 recipientWithdrawable,
        uint64 cancelledAt
    );

    function test_SenderCancelsAndAccrualFreezes() public {
        uint256 id = _createDefault();
        uint256 senderBefore = token.balanceOf(sender);

        vm.warp(START + 250);

        vm.expectEmit(true, true, true, true, address(streamPay));
        emit StreamCancelled(id, sender, 750e6, 250e6, uint64(START + 250));

        vm.prank(sender);
        streamPay.cancelStream(id);

        assertEq(token.balanceOf(sender), senderBefore + 750e6);
        assertEq(token.balanceOf(address(streamPay)), 250e6);

        StreamPay.StreamView memory view_ = streamPay.getStream(id);
        assertEq(uint256(view_.status), uint256(StreamPay.Status.Cancelled));
        assertEq(view_.cancelledAt, START + 250);
        assertEq(view_.amount - view_.accrued, 750e6);
        assertEq(view_.accrued, 250e6);
        assertEq(view_.withdrawable, 250e6);

        // Accrual must stay frozen after cancellation.
        vm.warp(START + 900);
        assertEq(streamPay.accruedOf(id), 250e6);
        assertEq(streamPay.withdrawableOf(id), 250e6);
    }

    function test_RecipientCancelsAndSenderGetsRefund() public {
        uint256 id = _createDefault();
        uint256 senderBefore = token.balanceOf(sender);

        vm.warp(START + 400);

        vm.expectEmit(true, true, true, true, address(streamPay));
        emit StreamCancelled(id, recipient, 600e6, 400e6, uint64(START + 400));

        vm.prank(recipient);
        streamPay.cancelStream(id);

        assertEq(token.balanceOf(sender), senderBefore + 600e6);

        vm.prank(recipient);
        assertEq(streamPay.withdraw(id), 400e6);
        assertEq(token.balanceOf(recipient), 400e6);
    }

    function test_CancelAfterPartialWithdrawalConservesFunds() public {
        uint256 id = _createDefault();

        vm.warp(START + 250);
        vm.prank(recipient);
        streamPay.withdraw(id);

        uint256 senderBefore = token.balanceOf(sender);
        vm.warp(START + 500);

        vm.prank(sender);
        streamPay.cancelStream(id);

        assertEq(token.balanceOf(sender), senderBefore + 500e6);
        assertEq(streamPay.getStream(id).withdrawn, 250e6);
        assertEq(streamPay.getStream(id).withdrawable, 250e6);

        vm.prank(recipient);
        streamPay.withdraw(id);

        assertEq(token.balanceOf(recipient), 500e6);
        assertEq(token.balanceOf(address(streamPay)), 0);
    }

    function test_CancelBeforeStartRefundsEverything() public {
        uint64 start = uint64(START + 500);
        uint256 id = _createScheduled(start, start + DURATION);
        uint256 senderBefore = token.balanceOf(sender);

        vm.prank(sender);
        streamPay.cancelStream(id);

        assertEq(token.balanceOf(sender), senderBefore + AMOUNT);
        assertEq(streamPay.accruedOf(id), 0);
        assertEq(token.balanceOf(address(streamPay)), 0);
    }

    function test_RevertWhen_StrangerCancels() public {
        uint256 id = _createDefault();
        vm.warp(START + 100);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.NotStreamParty.selector, id, stranger));
        streamPay.cancelStream(id);
    }

    function test_RevertWhen_CancelledTwice() public {
        uint256 id = _createDefault();
        vm.warp(START + 100);

        vm.prank(sender);
        streamPay.cancelStream(id);

        vm.prank(sender);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.StreamAlreadyCancelled.selector, id));
        streamPay.cancelStream(id);
    }

    function test_RevertWhen_CancellingCompletedStream() public {
        uint256 id = _createDefault();
        vm.warp(START + DURATION);

        vm.prank(sender);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.StreamAlreadyEnded.selector, id));
        streamPay.cancelStream(id);
    }

    function test_RevertWhen_CancellingMissingStream() public {
        vm.prank(sender);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.StreamNotFound.selector, 42));
        streamPay.cancelStream(42);
    }

    function testFuzz_CancelConservesTotal(uint128 amount, uint32 elapsed, uint32 duration) public {
        vm.assume(amount > 0);
        vm.assume(amount <= 1_000_000e6);
        vm.assume(duration > 1);
        vm.assume(elapsed < duration);

        vm.prank(sender);
        uint256 id = streamPay.createStream(recipient, amount, 0, uint64(START + duration));

        vm.warp(START + elapsed);

        uint256 accruedBefore = streamPay.accruedOf(id);
        uint256 refund = uint256(amount) - accruedBefore;

        vm.prank(sender);
        streamPay.cancelStream(id);

        assertEq(streamPay.getStream(id).withdrawable, accruedBefore);
        assertEq(streamPay.getStream(id).accrued, accruedBefore);
        assertEq(refund + accruedBefore, amount);

        if (accruedBefore > 0) {
            vm.prank(recipient);
            streamPay.withdraw(id);
        }
        assertEq(token.balanceOf(address(streamPay)), 0);
    }
}

/* -------------------------------------------------------------------------- */
/*                              Permit creation                               */
/* -------------------------------------------------------------------------- */

contract StreamPayPermitTest is StreamPayTestBase {
    bytes32 internal constant PERMIT_TYPEHASH = keccak256(
        "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
    );

    uint256 internal constant OWNER_PK = 0xB0B;
    address internal owner;

    function setUp() public override {
        super.setUp();
        owner = vm.addr(OWNER_PK);
        token.mint(owner, AMOUNT);
    }

    function _signPermit(uint256 privateKey, uint256 value, uint256 deadline)
        internal
        view
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        address signer = vm.addr(privateKey);
        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH, signer, address(streamPay), value, token.nonces(signer), deadline
            )
        );
        bytes32 digest =
            keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
        return vm.sign(privateKey, digest);
    }

    function test_CreateWithPermitNeedsNoApprovalTransaction() public {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(OWNER_PK, AMOUNT, deadline);

        assertEq(token.allowance(owner, address(streamPay)), 0);

        vm.prank(owner);
        uint256 id = streamPay.createStreamWithPermit(
            recipient, AMOUNT, 0, uint64(START + DURATION), deadline, v, r, s
        );

        assertEq(id, 1);
        assertEq(token.balanceOf(address(streamPay)), AMOUNT);
        // Permit granted exactly the needed amount, and the pull consumed it.
        assertEq(token.allowance(owner, address(streamPay)), 0);
        assertEq(token.balanceOf(owner), 0);
    }

    function test_CreateWithPermitSurvivesFrontRunPermit() public {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(OWNER_PK, AMOUNT, deadline);

        // An observer submits the permit first. The signature is bound to this contract
        // as spender, so this only grants the allowance earlier.
        vm.prank(stranger);
        token.permit(owner, address(streamPay), AMOUNT, deadline, v, r, s);

        vm.prank(owner);
        uint256 id = streamPay.createStreamWithPermit(
            recipient, AMOUNT, 0, uint64(START + DURATION), deadline, v, r, s
        );

        assertEq(id, 1);
        assertEq(token.allowance(owner, address(streamPay)), 0);
    }

    function test_RevertWhen_PermitSignatureIsInvalidAndNoAllowance() public {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(0xBAD, AMOUNT, deadline);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.InsufficientAllowance.selector, 0, AMOUNT));
        streamPay.createStreamWithPermit(
            recipient, AMOUNT, 0, uint64(START + DURATION), deadline, v, r, s
        );
    }

    function test_PermitFailureFallsBackToExistingAllowance() public {
        uint256 deadline = block.timestamp - 1; // expired on purpose
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(OWNER_PK, AMOUNT, deadline);

        vm.prank(owner);
        token.approve(address(streamPay), AMOUNT);

        vm.prank(owner);
        uint256 id = streamPay.createStreamWithPermit(
            recipient, AMOUNT, 0, uint64(START + DURATION), deadline, v, r, s
        );

        assertEq(id, 1);
        assertEq(token.balanceOf(owner), 0);
    }

    function test_RevertWhen_PermitDoesNotMatchCreateAmount() public {
        // The contract asks the token for a permit of exactly `amount`. A signature for a
        // different value is invalid, the best-effort permit is skipped, and the normal
        // allowance check rejects the under-funded create.
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(OWNER_PK, AMOUNT - 1, deadline);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(StreamPay.InsufficientAllowance.selector, 0, AMOUNT));
        streamPay.createStreamWithPermit(
            recipient, AMOUNT, 0, uint64(START + DURATION), deadline, v, r, s
        );
    }
}

/* -------------------------------------------------------------------------- */
/*                                  Pagination                                */
/* -------------------------------------------------------------------------- */

contract StreamPayViewsTest is StreamPayTestBase {
    function test_PagesAreNewestFirst() public {
        uint256[] memory ids = new uint256[](5);
        for (uint256 i = 0; i < 5; ++i) {
            ids[i] = _createDefault();
        }

        StreamPay.StreamView[] memory page = streamPay.getSenderStreams(sender, 0, 2);
        assertEq(page.length, 2);
        assertEq(page[0].id, ids[4]);
        assertEq(page[1].id, ids[3]);

        page = streamPay.getSenderStreams(sender, 2, 2);
        assertEq(page.length, 2);
        assertEq(page[0].id, ids[2]);
        assertEq(page[1].id, ids[1]);

        page = streamPay.getSenderStreams(sender, 4, 2);
        assertEq(page.length, 1);
        assertEq(page[0].id, ids[0]);

        page = streamPay.getSenderStreams(sender, 5, 2);
        assertEq(page.length, 0);
    }

    function test_RecipientPageAndCounts() public {
        _createDefault();
        _createDefault();

        StreamPay.StreamView[] memory page = streamPay.getRecipientStreams(recipient, 0, 10);
        assertEq(page.length, 2);
        assertEq(page[0].recipient, recipient);
        assertEq(streamPay.recipientStreamCount(recipient), 2);
        assertEq(streamPay.recipientStreamCount(stranger), 0);

        page = streamPay.getRecipientStreams(stranger, 0, 10);
        assertEq(page.length, 0);
    }

    function test_RevertWhen_PageLimitIsInvalid() public {
        vm.expectRevert(abi.encodeWithSelector(StreamPay.InvalidPage.selector, 0));
        streamPay.getSenderStreams(sender, 0, 0);

        vm.expectRevert(abi.encodeWithSelector(StreamPay.InvalidPage.selector, 51));
        streamPay.getSenderStreams(sender, 0, 51);
    }

    function test_GetStreamRevertsForMissingStream() public {
        vm.expectRevert(abi.encodeWithSelector(StreamPay.StreamNotFound.selector, 7));
        streamPay.getStream(7);

        vm.expectRevert(abi.encodeWithSelector(StreamPay.StreamNotFound.selector, 7));
        streamPay.accruedOf(7);

        vm.expectRevert(abi.encodeWithSelector(StreamPay.StreamNotFound.selector, 7));
        streamPay.withdrawableOf(7);
    }
}

/* -------------------------------------------------------------------------- */
/*                                Reentrancy                                  */
/* -------------------------------------------------------------------------- */

contract StreamPayReentrancyTest is Test {
    ReentrantToken internal token;
    StreamPay internal streamPay;

    address internal sender;
    address internal recipient;

    uint256 internal constant START = 1_800_000_000;
    uint256 internal constant AMOUNT = 1_000e6;

    bytes4 internal constant REENTRANCY_GUARD_SELECTOR =
        bytes4(keccak256("ReentrancyGuardReentrantCall()"));

    function setUp() public {
        vm.warp(START);
        sender = makeAddr("sender");
        recipient = makeAddr("recipient");

        token = new ReentrantToken();
        streamPay = new StreamPay(IERC20(address(token)));

        token.mint(sender, AMOUNT);
        vm.prank(sender);
        token.approve(address(streamPay), AMOUNT);
    }

    function test_ReentrantWithdrawalIsBlockedByGuard() public {
        // The token contract itself is the recipient, so a hook inside transfer would be
        // authorized to call withdraw if the guard did not stop it.
        vm.prank(sender);
        uint256 id = streamPay.createStream(address(token), AMOUNT, 0, uint64(START + 1_000));

        vm.warp(START + 500);
        token.arm(streamPay, id);

        uint256 withdrawn = token.attackWithdraw();

        assertEq(withdrawn, 500e6);
        assertTrue(token.attemptMade(), "hook should run during transfer");
        assertTrue(token.attemptReverted(), "nested withdrawal should revert");
        assertEq(token.lastRevertSelector(), REENTRANCY_GUARD_SELECTOR);
        assertEq(streamPay.getStream(id).withdrawn, 500e6);
        assertEq(token.balanceOf(address(token)), 500e6);
    }

    function test_MultipleSequentialWithdrawalsStillWork() public {
        vm.prank(sender);
        uint256 id = streamPay.createStream(recipient, AMOUNT, 0, uint64(START + 1_000));

        vm.warp(START + 100);
        vm.prank(recipient);
        streamPay.withdraw(id);

        vm.warp(START + 200);
        vm.prank(recipient);
        streamPay.withdraw(id);

        assertEq(token.balanceOf(recipient), 200e6);
    }
}
