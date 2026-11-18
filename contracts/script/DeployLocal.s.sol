// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { StreamPay } from "../src/StreamPay.sol";
import { MockTUSD8 } from "../src/mocks/MockTUSD8.sol";

/**
 * @notice Local end-to-end fixture: mock tUSD8, StreamPay, and streams in both directions
 * for the three default Anvil accounts.
 *
 * Usage:
 *   anvil --chain-id 44005
 *   forge script script/DeployLocal.s.sol:DeployLocal \
 *     --rpc-url http://127.0.0.1:8545 --broadcast
 *
 * Writes deployments/local.json and web/lib/deployments/local.json.
 */
contract DeployLocal is Script {
    uint256 internal constant ANVIL_PK_0 =
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 internal constant ANVIL_PK_1 =
        0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    uint256 internal constant ANVIL_PK_2 =
        0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;

    address internal constant ACCOUNT_0 = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address internal constant ACCOUNT_1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address internal constant ACCOUNT_2 = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

    function run() external {
        MockTUSD8 token;
        StreamPay streamPay;

        vm.startBroadcast(ANVIL_PK_0);
        token = new MockTUSD8();
        streamPay = new StreamPay(IERC20(address(token)));
        token.mint(ACCOUNT_0, 1_000_000e6);
        token.mint(ACCOUNT_1, 1_000_000e6);
        token.mint(ACCOUNT_2, 1_000_000e6);
        vm.stopBroadcast();
        address tokenAddress = address(token);

        // Incoming streams to account 0, so the demo wallet sees money accrue.
        vm.startBroadcast(ANVIL_PK_1);
        token.approve(address(streamPay), type(uint256).max);
        streamPay.createStream(ACCOUNT_0, 8_400e6, 0, uint64(block.timestamp + 30 days));
        streamPay.createStream(ACCOUNT_0, 1_250e6, 0, uint64(block.timestamp + 90 minutes));
        vm.stopBroadcast();

        vm.startBroadcast(ANVIL_PK_2);
        token.approve(address(streamPay), type(uint256).max);
        streamPay.createStream(ACCOUNT_0, 2_500e6, 0, uint64(block.timestamp + 7 days));
        vm.stopBroadcast();

        // Outgoing streams from account 0.
        vm.startBroadcast(ANVIL_PK_0);
        token.approve(address(streamPay), type(uint256).max);
        streamPay.createStream(ACCOUNT_1, 15_000e6, 0, uint64(block.timestamp + 14 days));
        streamPay.createStream(
            ACCOUNT_2, 4_000e6, uint64(block.timestamp + 1 hours), uint64(block.timestamp + 30 days)
        );
        vm.stopBroadcast();

        console2.log("Mock tUSD8:", tokenAddress);
        console2.log("StreamPay: ", address(streamPay));
        console2.log("Total streams:", streamPay.streamCount());

        _writeDeployment(address(streamPay), tokenAddress);
    }

    function _writeDeployment(address streamPay, address tokenAddress) internal {
        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeString(obj, "network", "Anvil (local)");
        vm.serializeAddress(obj, "streamPay", streamPay);
        vm.serializeAddress(obj, "token", tokenAddress);
        vm.serializeString(obj, "tokenSymbol", "tUSD8");
        vm.serializeUint(obj, "tokenDecimals", 6);
        vm.serializeUint(obj, "deployBlock", block.number);
        vm.serializeUint(obj, "deployedAt", block.timestamp);
        vm.serializeString(obj, "rpcUrl", "http://127.0.0.1:8545");
        string memory json = vm.serializeString(obj, "contract", "StreamPay.sol:StreamPay");

        vm.writeJson(json, "../deployments/local.json");
        vm.writeJson(json, "../web/lib/deployments/local.json");
    }
}
