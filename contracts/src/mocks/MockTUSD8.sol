// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @notice Test-only tUSD8 stand-in with the same decimals and EIP-2612 shape as the
 * official Aevum test token. Never deployed as part of the production flow.
 */
contract MockTUSD8 is ERC20Permit {
    constructor() ERC20("tUSD8", "tUSD8") ERC20Permit("tUSD8") { }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
