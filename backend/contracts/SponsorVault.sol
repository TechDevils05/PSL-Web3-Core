// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Custom errors for gas optimization
error ZeroAmount();
error TransferFailed();
error Unauthorized();
error NoActiveFans();

contract SponsorVault is ReentrancyGuard {
    IERC20 public wireFluidToken;
    address public owner;
    address public pcbWallet;
    address public franchiseWallet;

    constructor(address _token, address _pcb, address _franchise) {
        wireFluidToken = IERC20(_token);
        owner = msg.sender; // You (or the Oracle) control the triggers
        pcbWallet = _pcb;
        franchiseWallet = _franchise;
    }

    modifier onlyOwner() {
        if(msg.sender != owner) revert Unauthorized();
        _;
    }

    // A brand (HBL, KFC) deposits their advertising budget into the smart contract
    function depositSponsorship(uint256 amount) external nonReentrant {
        if(amount == 0) revert ZeroAmount();
        
        bool success = wireFluidToken.transferFrom(msg.sender, address(this), amount);
        if(!success) revert TransferFailed();
    }

    // The Gelato Oracle calls this when the "Strategic Timeout" happens
    function triggerAttentionYield(address[] calldata activeFans, uint256 totalAmountToDistribute) external onlyOwner nonReentrant {
        if(totalAmountToDistribute == 0) revert ZeroAmount();
        if(activeFans.length == 0) revert NoActiveFans();

        // The exact mathematical split
        uint256 pcbShare = (totalAmountToDistribute * 50) / 100;
        uint256 franchiseShare = (totalAmountToDistribute * 20) / 100;
        uint256 fanPool = (totalAmountToDistribute * 30) / 100;
        uint256 perFanShare = fanPool / activeFans.length;

        // 1. Route 50% to the PCB
        bool pcbSuccess = wireFluidToken.transfer(pcbWallet, pcbShare);
        if(!pcbSuccess) revert TransferFailed();

        // 2. Route 20% to the active Franchise
        bool franchiseSuccess = wireFluidToken.transfer(franchiseWallet, franchiseShare);
        if(!franchiseSuccess) revert TransferFailed();

        // 3. Route 30% directly to the fans who clicked the UI button
        for(uint i = 0; i < activeFans.length; i++) {
            bool fanSuccess = wireFluidToken.transfer(activeFans[i], perFanShare);
            if(!fanSuccess) revert TransferFailed();
        }
    }
}