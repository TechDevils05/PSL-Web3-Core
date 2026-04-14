// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title  MockWFT — WireFluid Token (test-only)
/// @notice A mintable ERC-20 used for local Hardhat testing.
contract MockWFT is ERC20 {
    constructor(uint256 initialSupply) ERC20("WireFluid Token", "WFT") {
        _mint(msg.sender, initialSupply);
    }

    /// @notice Faucet – anyone can mint tokens on the test network
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
