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

    // Deadshot.io rarity scheme
    enum Tier { COMMON, UNCOMMON, RARE, EPIC, LEGENDARY }

    // Supply caps per tier
    mapping(uint8 => uint256) public maxSupplyByTier;
    mapping(uint8 => uint256) public mintedByTier;

    mapping(uint256 => Tier)   public tokenTier;
    mapping(uint256 => string) public tokenPlayer;          // tokenId → playerId
    mapping(string  => uint256[]) public playerTokens;      // playerId → tokenIds (used by oracle)

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
        erc6551Registry  = _registry;
        tbImplementation = _tbImpl;

        // Deadshot.io supply caps
        maxSupplyByTier[0] = 10000; // COMMON
        maxSupplyByTier[1] =  1000; // UNCOMMON
        maxSupplyByTier[2] =   100; // RARE
        maxSupplyByTier[3] =    10; // EPIC
        maxSupplyByTier[4] =     2; // LEGENDARY
    }

    // ── Standard mint — starts at COMMON and evolves via oracle ─────────────
    function mintMoment(
        address to,
        string calldata _playerId,
        string calldata uri,
        uint8 initialTier
    ) external onlyOwner returns (uint256) {
        require(initialTier <= uint8(Tier.LEGENDARY), "Invalid tier");
        require(mintedByTier[initialTier] < maxSupplyByTier[initialTier], "Tier supply cap reached");

        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        tokenTier[tokenId]   = Tier(initialTier);
        tokenPlayer[tokenId] = _playerId;
        playerTokens[_playerId].push(tokenId);
        mintedByTier[initialTier]++;

        _createTBA(tokenId);

        emit MomentMinted(tokenId, to, _playerId);
        return tokenId;
    }

    // ── Deadshot mint — mint directly at any tier (LEGENDARY for ICON events) ─
    function mintAtTier(
        address to,
        string calldata _playerId,
        string calldata uri,
        uint8 tier
    ) external onlyOwner returns (uint256) {
        require(tier <= uint8(Tier.LEGENDARY), "Invalid tier");
        require(mintedByTier[tier] < maxSupplyByTier[tier], "Tier supply cap reached");

        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        tokenTier[tokenId]   = Tier(tier);
        tokenPlayer[tokenId] = _playerId;
        playerTokens[_playerId].push(tokenId);
        mintedByTier[tier]++;

        _createTBA(tokenId);

        emit MomentMinted(tokenId, to, _playerId);
        return tokenId;
    }

    // ── Upgrade tier — called by oracle only, can only go up ────────────────
    function upgradeTier(
        uint256 tokenId,
        Tier newTier,
        string calldata newUri
    ) external onlyOracle {
        Tier old = tokenTier[tokenId];
        require(uint8(newTier) > uint8(old), "Can only upgrade");
        tokenTier[tokenId] = newTier;
        _setTokenURI(tokenId, newUri);
        emit TierUpgraded(tokenId, old, newTier, newUri);
    }

    // ── View: get the playerId for a tokenId ────────────────────────────────
    // Exposed as a function so the ABI can call it (tokenPlayer is a mapping,
    // Solidity auto-generates a getter with the same signature)
    // No change needed — the auto-getter matches 'function tokenPlayer(uint256) view returns (string)'

    // ── View: get all tokenIds for a player ─────────────────────────────────
    function tokensOfPlayer(string calldata _playerId)
        external view returns (uint256[] memory)
    {
        return playerTokens[_playerId];
    }

    function setOracle(address _oracle) external onlyOwner {
        oracleContract = _oracle;
    }

    function getTBAAddress(uint256 tokenId) external view returns (address) {
        return IERC6551Registry(erc6551Registry).account(
            tbImplementation, block.chainid, address(this), tokenId, 0
        );
    }

    // ── Internal ─────────────────────────────────────────────────────────────
    function _createTBA(uint256 tokenId) internal {
        IERC6551Registry(erc6551Registry).createAccount(
            tbImplementation,
            block.chainid,
            address(this),
            tokenId,
            0,
            ""
        );
    }
}