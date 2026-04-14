// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IERC6551Registry {
    function createAccount(
        address implementation,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 salt,
        bytes calldata initData
    ) external returns (address);

    function account(
        address implementation,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 salt
    ) external view returns (address);
}

contract PSLMomentNFT is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;
    address public oracleContract;
    address public erc6551Registry;
    address public tbImplementation;

    enum Tier { COMMON, RARE, EPIC, LEGEND, ICON }

    mapping(uint256 => Tier) public tokenTier;
    mapping(uint256 => string) public tokenPlayer;
    mapping(string => uint256[]) public playerTokens;

    event MomentMinted(uint256 indexed tokenId, address indexed owner, string playerId);
    event TierUpgraded(uint256 indexed tokenId, Tier oldTier, Tier newTier, string newUri);

    modifier onlyOracle() {
        require(msg.sender == oracleContract, "Not oracle");
        _;
    }

    constructor(address _registry, address _tbImpl)
        ERC721("PSL Dynamic Moment", "PSLDM")
        Ownable(msg.sender)
    {
        erc6551Registry = _registry;
        tbImplementation = _tbImpl;
    }

    function mintMoment(address to, string calldata _playerId, string calldata uri)
        external onlyOwner returns (uint256)
    {
        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        tokenTier[tokenId] = Tier.COMMON;
        tokenPlayer[tokenId] = _playerId;
        playerTokens[_playerId].push(tokenId);

        // Create the ERC-6551 Token Bound Account
        IERC6551Registry(erc6551Registry).createAccount(
            tbImplementation,
            block.chainid,
            address(this),
            tokenId,
            0,
            ""
        );

        emit MomentMinted(tokenId, to, _playerId);
        return tokenId;
    }

    function upgradeTier(uint256 tokenId, Tier newTier, string calldata newUri)
        external onlyOracle
    {
        Tier old = tokenTier[tokenId];
        require(uint8(newTier) > uint8(old), "Can only upgrade");
        tokenTier[tokenId] = newTier;
        _setTokenURI(tokenId, newUri);
        emit TierUpgraded(tokenId, old, newTier, newUri);
    }

    function setOracle(address _oracle) external onlyOwner {
        oracleContract = _oracle;
    }

    function getTBAAddress(uint256 tokenId) external view returns (address) {
        return IERC6551Registry(erc6551Registry).account(
            tbImplementation, block.chainid, address(this), tokenId, 0
        );
    }

    function tokensOfPlayer(string calldata _playerId) external view returns (uint256[] memory) {
        return playerTokens[_playerId];
    }
}