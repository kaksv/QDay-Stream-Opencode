// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { StreamPay } from "../src/StreamPay.sol";

/**
 * @notice Deploys StreamPay against the official tUSD8 token.
 *
 * Usage:
 *   PRIVATE_KEY=0x... forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url https://rpc-test.qday.info --broadcast
 *
 * Required env:
 *   PRIVATE_KEY  funded deployer key (never commit it)
 * Optional env:
 *   TOKEN_ADDRESS      defaults to the official Aevum tUSD8 address
 *   EXPECTED_CHAIN_ID  defaults to 44005
 *   WRITE_DEPLOYMENT   defaults to true
 */
contract Deploy is Script {
    address internal constant TUSD8 = 0x456569838f1d43009A91ebA4263147Afd7233483;

    function run() external returns (StreamPay streamPay) {
        uint256 expectedChainId = vm.envOr("EXPECTED_CHAIN_ID", uint256(44005));
        require(
            block.chainid == expectedChainId,
            "chain id mismatch: refusing to deploy to the wrong network"
        );

        address tokenAddress = vm.envOr("TOKEN_ADDRESS", TUSD8);
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);

        console2.log("Deploying StreamPay");
        console2.log("  chain id:", block.chainid);
        console2.log("  token:   ", tokenAddress);
        console2.log("  deployer:", deployer);

        vm.startBroadcast(privateKey);
        streamPay = new StreamPay(IERC20(tokenAddress));
        vm.stopBroadcast();

        console2.log("StreamPay deployed at:", address(streamPay));
        console2.log("Block:", block.number);

        if (vm.envOr("WRITE_DEPLOYMENT", true)) {
            _writeDeployment(address(streamPay), tokenAddress, deployer);
        }
    }

    function _writeDeployment(address streamPay, address tokenAddress, address deployer) internal {
        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeString(obj, "network", "QDay Aevum Testnet");
        vm.serializeAddress(obj, "streamPay", streamPay);
        vm.serializeAddress(obj, "token", tokenAddress);
        vm.serializeString(obj, "tokenSymbol", "tUSD8");
        vm.serializeUint(obj, "tokenDecimals", 6);
        vm.serializeAddress(obj, "deployer", deployer);
        vm.serializeUint(obj, "deployBlock", block.number);
        vm.serializeUint(obj, "deployedAt", block.timestamp);
        vm.serializeString(obj, "rpcUrl", "https://rpc-test.qday.info");
        vm.serializeString(obj, "explorer", "https://explorer-test.qday.info");
        string memory json = vm.serializeString(obj, "contract", "StreamPay.sol:StreamPay");

        vm.writeJson(json, "../deployments/aevum.json");
        vm.writeJson(json, "../web/lib/deployments/aevum.json");
    }
}
