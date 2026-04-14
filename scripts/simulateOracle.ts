import hre from "hardhat";

/**
 * Hardhat v3: ethers is on the network connection, not on hre directly.
 * Pattern: const { ethers } = await hre.network.connect();
 */
async function main() {
  console.log("🔥 Initializing WireFluid AI Oracle Node...");

  const { ethers } = await hre.network.connect();

  const [oracleWallet] = await ethers.getSigners();
  console.log(`📡 Connected Oracle Wallet: ${oracleWallet.address}`);

  console.log("\n⏳ Deploying MomentOracle to WireFluid Network...");
  const OracleFactory = await ethers.getContractFactory("MomentOracle");
  const oracle = await OracleFactory.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`✅ Contract Locked & Deployed at: ${oracleAddress}`);

  const mockMomentId = "PSL-FINAL-OVER-20-BALL-6";
  const aiPressureScore = Math.floor(Math.random() * (100 - 75 + 1)) + 75;

  console.log(`\n🧠 AI Telemetry Analysis Complete.`);
  console.log(`🏏 Match Moment: ${mockMomentId}`);
  console.log(`📊 Calculated Pressure Index: ${aiPressureScore}/100`);

  console.log(`\n⚡ Forging AI data onto WireFluid Blockchain...`);
  const tx = await oracle.updatePressureIndex(mockMomentId, aiPressureScore);
  const receipt = await tx.wait();
  console.log(`✅ Transaction Mined! Gas Used: ${receipt?.gasUsed.toString()}`);

  const onChainRarity = await oracle.getMomentRarity(mockMomentId);
  console.log(
    `\n🏆 On-Chain Verification: Moment classified as [ ${onChainRarity.toUpperCase()} ]`,
  );
  console.log("🚀 Module 3 (AI Oracle) Execution Complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});