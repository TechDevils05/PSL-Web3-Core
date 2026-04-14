// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface INFTForYield {
    function nextTokenId() external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function getTBAAddress(uint256 tokenId) external view returns (address);
    function tokenTier(uint256 tokenId) external view returns (uint8);
}

contract YieldDistribution is Ownable, ReentrancyGuard {
    address public nftContract;
    address public oracleContract;
    uint256 public totalAccumulated;

    mapping(uint256 => uint256) public claimableByToken;

    event FeesReceived(uint256 amount, address from);
    event YieldDistributed(uint256 totalAmount, uint256 tokenCount);
    event YieldClaimed(uint256 indexed tokenId, uint256 amount);

    constructor() Ownable(msg.sender) {}

    receive() external payable {
        totalAccumulated += msg.value;
        emit FeesReceived(msg.value, msg.sender);
    }

    function distributeYield() external onlyOwner {
        uint256 total = totalAccumulated;
        require(total > 0, "Nothing to distribute");
        uint256 count = INFTForYield(nftContract).nextTokenId();

        // Calculate total weight (tier score per token)
        uint256 totalWeight;
        for (uint256 i = 0; i < count; i++) {
            totalWeight += uint256(INFTForYield(nftContract).tokenTier(i)) + 1;
        }

        // Assign proportional share
        for (uint256 i = 0; i < count; i++) {
            uint256 weight = uint256(INFTForYield(nftContract).tokenTier(i)) + 1;
            claimableByToken[i] += (total * weight) / totalWeight;
        }

        totalAccumulated = 0;
        emit YieldDistributed(total, count);
    }

    function claimYield(uint256 tokenId) external nonReentrant {
        require(INFTForYield(nftContract).ownerOf(tokenId) == msg.sender, "Not owner");
        uint256 amount = claimableByToken[tokenId];
        require(amount > 0, "Nothing to claim");
        claimableByToken[tokenId] = 0;
        address tba = INFTForYield(nftContract).getTBAAddress(tokenId);
        payable(tba).transfer(amount);
        emit YieldClaimed(tokenId, amount);
    }

    function setContracts(address _nft, address _oracle) external onlyOwner {
        nftContract = _nft;
        oracleContract = _oracle;
    }
}