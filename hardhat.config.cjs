require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    wirefluid: {
      url: process.env.WIREFLUID_RPC_URL,
      chainId: Number(process.env.WIREFLUID_CHAIN_ID),
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      wirefluid: process.env.WIRESCAN_API_KEY ?? "placeholder",
    },
    customChains: [
      {
        network: "wirefluid",
        chainId: Number(process.env.WIREFLUID_CHAIN_ID),
        urls: {
          apiURL: "https://wirefluidscan.com/api",        // ← confirm this with WireScan docs
          browserURL: "https://wirefluidscan.com",
        },
      },
    ],
  },
};