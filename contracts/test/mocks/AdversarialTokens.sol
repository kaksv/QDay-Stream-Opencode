// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { StreamPay } from "../../src/StreamPay.sol";

/// @dev Simulates a fee-on-transfer stablecoin. StreamPay must reject it rather than
/// silently create an under-collateralized stream.
contract FeeOnTransferToken is ERC20 {
    uint256 public constant FEE_BPS = 100; // 1%

    constructor() ERC20("Fee Token", "FEE") { }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = (value * FEE_BPS) / 10_000;
            super._update(from, address(0xdead), fee);
            super._update(from, to, value - fee);
        } else {
            super._update(from, to, value);
        }
    }
}

/// @dev Token that attempts to re-enter StreamPay while a withdrawal transfer is in
/// flight. Used to prove the reentrancy guard blocks nested withdrawals.
contract ReentrantToken is ERC20 {
    StreamPay public streamPay;
    uint256 public attackStreamId;
    bool public armed;
    bool public attemptMade;
    bool public attemptReverted;
    bytes4 public lastRevertSelector;

    constructor() ERC20("Reentrant Token", "REENT") { }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function arm(StreamPay streamPay_, uint256 streamId) external {
        streamPay = streamPay_;
        attackStreamId = streamId;
        armed = true;
    }

    /// @notice Called by the test to start a withdrawal as this contract (the recipient).
    function attackWithdraw() external returns (uint256) {
        attemptMade = false;
        attemptReverted = false;
        return streamPay.withdraw(attackStreamId);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (armed && from != address(0) && to != address(0)) {
            armed = false;
            attemptMade = true;
            (bool ok, bytes memory revertData) =
                address(streamPay).call(abi.encodeCall(StreamPay.withdraw, (attackStreamId)));
            if (!ok) {
                attemptReverted = true;
                if (revertData.length >= 4) {
                    bytes4 selector;
                    // solhint-disable-next-line no-inline-assembly
                    assembly {
                        selector := mload(add(revertData, 0x20))
                    }
                    lastRevertSelector = selector;
                }
            }
        }
        super._update(from, to, value);
    }
}

/// @dev 19-decimal token, used to check the constructor sanity guard.
contract HighDecimalsToken is ERC20 {
    constructor() ERC20("High", "HIGH") { }

    function decimals() public pure override returns (uint8) {
        return 19;
    }
}
