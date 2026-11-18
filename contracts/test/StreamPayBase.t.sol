// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { StreamPay } from "../src/StreamPay.sol";
import { MockTUSD8 } from "../src/mocks/MockTUSD8.sol";

abstract contract StreamPayTestBase is Test {
    MockTUSD8 internal token;
    StreamPay internal streamPay;

    address internal sender;
    address internal recipient;
    address internal stranger;

    uint256 internal constant START = 1_800_000_000;
    uint256 internal constant AMOUNT = 1_000e6; // 1,000 tUSD8
    uint64 internal constant DURATION = 1_000; // seconds

    function setUp() public virtual {
        vm.warp(START);

        sender = makeAddr("sender");
        recipient = makeAddr("recipient");
        stranger = makeAddr("stranger");

        token = new MockTUSD8();
        streamPay = new StreamPay(IERC20(address(token)));

        token.mint(sender, 1_000_000e6);
        vm.prank(sender);
        token.approve(address(streamPay), type(uint256).max);
    }

    function _createDefault() internal returns (uint256 streamId) {
        vm.prank(sender);
        streamId = streamPay.createStream(recipient, AMOUNT, 0, uint64(START) + DURATION);
    }

    function _createScheduled(uint64 startTime, uint64 endTime)
        internal
        returns (uint256 streamId)
    {
        vm.prank(sender);
        streamId = streamPay.createStream(recipient, AMOUNT, startTime, endTime);
    }
}
