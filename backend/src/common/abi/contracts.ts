// Minimal ABIs — only the functions the backend needs to call.
// Full ABIs live in frontend/src/abi/ after hardhat compile.

export const NFT_ABI = [
  'function mintMoment(address to, string playerId, string uri, uint8 initialTier) returns (uint256)',
  'function mintAtTier(address to, string playerId, string uri, uint8 tier) returns (uint256)',
  'function upgradeTier(uint256 tokenId, uint8 newTier, string newUri)',
  'function tokenTier(uint256 tokenId) view returns (uint8)',
  'function playerId(uint256 tokenId) view returns (string)',
  'function getTBAAddress(uint256 tokenId) view returns (address)',
  'function playerTokens(string playerId) view returns (uint256[])',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function nextTokenId() view returns (uint256)',
  'function mintedByTier(uint8 tier) view returns (uint256)',
  'function maxSupplyByTier(uint8 tier) view returns (uint256)',
  'event MomentMinted(uint256 indexed tokenId, address indexed owner, string playerId, uint8 tier)',
  'event TierUpgraded(uint256 indexed tokenId, uint8 oldTier, uint8 newTier, string newUri)',
];

export const ORACLE_ABI = [
  'function updatePlayerStats(string playerId, uint256 runs, uint256 strikeRate, uint256 wickets, string rarityTrigger, string newTokenUri)',
  'function latestStats(string playerId) view returns (uint256 runs, uint256 strikeRate, uint256 wickets, string tier, uint256 lastUpdated)',
  'function registerPlayerToken(string playerId, uint256 tokenId)',
  'event StatsUpdated(string indexed playerId, uint256 runs, uint256 wickets, string tier)',
  'event UpgradeTriggered(string indexed playerId, uint256 indexed tokenId, string newTier)',
];

export const MARKETPLACE_ABI = [
  'function listings(uint256 tokenId) view returns (address seller, uint256 price, bool active)',
  'function listNFT(uint256 tokenId, uint256 price)',
  'function cancelListing(uint256 tokenId)',
  'function buyNFT(uint256 tokenId) payable',
  'event Listed(uint256 indexed tokenId, address indexed seller, uint256 price)',
  'event Sold(uint256 indexed tokenId, address indexed buyer, uint256 price)',
  'event ListingCancelled(uint256 indexed tokenId)',
];

export const YIELD_ABI = [
  'function claimableByToken(uint256 tokenId) view returns (uint256)',
  'function claimYield(uint256 tokenId)',
  'function distributeYield()',
  'function totalAccumulated() view returns (uint256)',
];

// Tier enum mapping — mirrors the Solidity enum order
export enum Tier {
  COMMON = 0,
  RARE = 1,
  EPIC = 2,
  LEGEND = 3,
  ICON = 4,
}

export const TIER_NAMES: Record<number, string> = {
  0: 'COMMON',
  1: 'RARE',
  2: 'EPIC',
  3: 'LEGEND',
  4: 'ICON',
};

export const TIER_FROM_STRING: Record<string, number> = {
  COMMON: 0,
  RARE: 1,
  EPIC: 2,
  LEGEND: 3,
  ICON: 4,
};

// Supply caps enforced on-chain, mirrored here for validation
export const MAX_SUPPLY: Record<string, number> = {
  COMMON: 10000,
  RARE: 1000,
  EPIC: 100,
  LEGEND: 10,
  ICON: 2, // Deadshot mints — 1 or 2 ever, globally
};
