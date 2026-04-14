import "dotenv/config";
import hre from "hardhat";
import { writeFileSync, readFileSync } from "node:fs";

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  PSL Module 4 — ScoutingPool Deployment");
  console.log("═══════════════════════════════════════════════════════\n");

  const { ethers } = await hre.network.connect();

  const [deployer] = await ethers.getSigners();
  console.log(`📡  Deployer wallet: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰  Balance: ${ethers.formatEther(balance)} ETH\n`);

  // ── 1. Deploy MockWFT ───────────────────────────────────────────────
  console.log("⏳  Deploying MockWFT (WireFluid Token)...");
  const WFT = await ethers.getContractFactory("MockWFT");
  const wft = await WFT.deploy(ethers.parseEther("1000000"));
  await wft.waitForDeployment();
  const wftAddr = await wft.getAddress();
  console.log(`✅  MockWFT deployed → ${wftAddr}\n`);

  // ── 2. Deploy ScoutingPool ──────────────────────────────────────────
  console.log("⏳  Deploying ScoutingPool...");
  const Pool = await ethers.getContractFactory("ScoutingPool");
  const pool = await Pool.deploy(wftAddr);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log(`✅  ScoutingPool deployed → ${poolAddr}\n`);

  // ── 3. Fund yield reserve with 100,000 WFT ─────────────────────────
  const fundAmount = ethers.parseEther("100000");
  console.log("⏳  Approving 100,000 WFT for yield reserve...");
  const approveTx = await wft.approve(poolAddr, fundAmount);
  await approveTx.wait();

  console.log("⏳  Funding yield reserve...");
  const fundTx = await pool.fundYieldReserve(fundAmount);
  await fundTx.wait();
  console.log("✅  Yield reserve funded with 100,000 WFT\n");

  // ── 4. Auto-write addresses to .env ────────────────────────────────
  let envContent = readFileSync(".env", "utf-8");
  envContent = envContent.replace(
    /SCOUTING_POOL_ADDRESS=".*"/,
    `SCOUTING_POOL_ADDRESS="${poolAddr}"`,
  );
  envContent = envContent.replace(
    /MOCK_WFT_ADDRESS=".*"/,
    `MOCK_WFT_ADDRESS="${wftAddr}"`,
  );
  writeFileSync(".env", envContent);
  console.log("📝  Contract addresses written to .env");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  Deployment Complete — Start the API with:");
  console.log("  cd backend && npm run start:api");
  console.log("═══════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
