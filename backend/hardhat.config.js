import "dotenv/config";
import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  plugins: [hardhatEthersPlugin],
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    localhost: {
      type: "http",
      url: process.env.RPC_URL ?? "http://127.0.0.1:8545",
    },
  },
};

export default config;
