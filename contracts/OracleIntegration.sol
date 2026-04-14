// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IPSLMomentNFT {
    enum Tier { COMMON, RARE, EPIC, LEGEND, ICON }
    function upgradeTier(uint256 tokenId, Tier newTier, string calldata newUri) external;
    function tokensOfPlayer(string calldata playerId) external view returns (uint256[] memory);
    function tokenTier(uint256 tokenId) external view returns (Tier);
}

contract OracleIntegration is Ownable {
    address public nftContract;

    struct PlayerStats {
        uint256 runs;
        uint256 strikeRate;
        uint256 wickets;
        string rarityTier;
        uint256 lastUpdated;
    }

    mapping(string => PlayerStats) public latestStats;

    event StatsUpdated(string indexed playerId, uint256 runs, uint256 wickets, string tier);
    event UpgradeTriggered(string indexed playerId, uint256 indexed tokenId, string newTier);

    constructor(address _nft) Ownable(msg.sender) {
        nftContract = _nft;
    }

    function updatePlayerStats(
        string calldata playerId,
        uint256 runs,
        uint256 strikeRate,
        uint256 wickets,
        string calldata rarityTrigger,
        string calldata newUri
    ) external onlyOwner {
        latestStats[playerId] = PlayerStats(runs, strikeRate, wickets, rarityTrigger, block.timestamp);

        IPSLMomentNFT.Tier newTier = _computeTier(rarityTrigger);
        uint256[] memory tokens = IPSLMomentNFT(nftContract).tokensOfPlayer(playerId);

        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 tokenId = tokens[i];
            IPSLMomentNFT.Tier current = IPSLMomentNFT(nftContract).tokenTier(tokenId);
            if (uint8(newTier) > uint8(current)) {
                IPSLMomentNFT(nftContract).upgradeTier(tokenId, newTier, newUri);
                emit UpgradeTriggered(playerId, tokenId, rarityTrigger);
            }
        }

        emit StatsUpdated(playerId, runs, wickets, rarityTrigger);
    }

    function _computeTier(string calldata t) internal pure returns (IPSLMomentNFT.Tier) {
        if (keccak256(bytes(t)) == keccak256("ICON"))   return IPSLMomentNFT.Tier.ICON;
        if (keccak256(bytes(t)) == keccak256("LEGEND")) return IPSLMomentNFT.Tier.LEGEND;
        if (keccak256(bytes(t)) == keccak256("EPIC"))   return IPSLMomentNFT.Tier.EPIC;
        if (keccak256(bytes(t)) == keccak256("RARE"))   return IPSLMomentNFT.Tier.RARE;
        return IPSLMomentNFT.Tier.COMMON;
    }

    function setNFTContract(address _nft) external onlyOwner {
        nftContract = _nft;
    }
}