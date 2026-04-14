import "@nomicfoundation/hardhat-ethers";
import hre from "hardhat";


async function main() {
  const { ethers } = hre;  
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying with:", deployer.address);

  // 0. Deploy ERC-6551 Registry (WireFluid doesn't have it)
  const Registry = await ethers.getContractFactory("ERC6551Registry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const REGISTRY = await registry.getAddress();  // ← this is your registry now
  console.log("ERC6551Registry:", REGISTRY);

  // 1. TokenBoundAccount
  const TBA = await ethers.getContractFactory("TokenBoundAccount");
  const tba = await TBA.deploy();
  await tba.waitForDeployment();
  const TBA_ADDRESS = await tba.getAddress();
  console.log("TBA Implementation:", TBA_ADDRESS);

  // 2. PSLMomentNFT — uses YOUR deployed registry, not the Sepolia one
  const NFT = await ethers.getContractFactory("PSLMomentNFT");
  const nft = await NFT.deploy(REGISTRY, TBA_ADDRESS);
  await nft.waitForDeployment();
  const NFT_ADDRESS = await nft.getAddress();
  console.log("PSLMomentNFT:", NFT_ADDRESS);

  // 3. OracleIntegration
  const Oracle = await ethers.getContractFactory("OracleIntegration");
  const oracle = await Oracle.deploy(NFT_ADDRESS);
  await oracle.waitForDeployment();
  const ORACLE_ADDRESS = await oracle.getAddress();
  console.log("OracleIntegration:", ORACLE_ADDRESS);

  // 4. YieldDistribution
  const Yield = await ethers.getContractFactory("YieldDistribution");
  const yieldDist = await Yield.deploy();
  await yieldDist.waitForDeployment();
  const YIELD_ADDRESS = await yieldDist.getAddress();
  console.log("YieldDistribution:", YIELD_ADDRESS);

  // 5. PSLMarketplace
  const Market = await ethers.getContractFactory("PSLMarketplace");
  const market = await Market.deploy(NFT_ADDRESS, YIELD_ADDRESS);
  await market.waitForDeployment();
  const MARKET_ADDRESS = await market.getAddress();
  console.log("PSLMarketplace:", MARKET_ADDRESS);

  // Wire them together
  await nft.setOracle(ORACLE_ADDRESS);
  await yieldDist.setContracts(NFT_ADDRESS, ORACLE_ADDRESS);

  console.log("\n✅ All deployed and wired. Copy these into your .env:");
  console.log("ERC6551_REGISTRY=" + REGISTRY);
  console.log("TBA_IMPLEMENTATION=" + TBA_ADDRESS);
  console.log("NFT_CONTRACT=" + NFT_ADDRESS);
  console.log("ORACLE_CONTRACT=" + ORACLE_ADDRESS);
  console.log("YIELD_CONTRACT=" + YIELD_ADDRESS);
  console.log("MARKETPLACE_CONTRACT=" + MARKET_ADDRESS);
}

main().catch(console.error);