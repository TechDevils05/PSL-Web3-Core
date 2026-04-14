// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Custom errors for gas efficiency
error Unauthorized();
error InvalidScore();

contract MomentOracle {
    address public oracleNode;

    // Mapping: Match Moment ID -> AI Pressure Index (1-100)
    mapping(string => uint8) public pressureScores;

    constructor() {
        oracleNode = msg.sender; // The backend script wallet that pushes the AI data
    }

    modifier onlyOracle() {
        if (msg.sender != oracleNode) revert Unauthorized();
        _;
    }

    // Called by your backend script/Gelato to push the AI's calculation on-chain
    function updatePressureIndex(string calldata momentId, uint8 score) external onlyOracle {
        if (score > 100) revert InvalidScore();
        pressureScores[momentId] = score;
    }

    // Called by the main NFT Minting Contract (Module 1) to determine the rarity trait
    function getMomentRarity(string calldata momentId) external view returns (string memory) {
        uint8 score = pressureScores[momentId];

        if (score >= 90) return "Legendary";
        if (score >= 75) return "Epic";
        if (score >= 50) return "Rare";
        return "Common";
    }
}