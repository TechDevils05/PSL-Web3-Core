export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  adminSecret: process.env.ADMIN_SECRET || 'dev-secret',

  chain: {
    rpcUrl: process.env.WIREFLUID_RPC_URL,
    privateKey: process.env.PRIVATE_KEY,
    wsUrl: process.env.RPC_WS_URL,   // ← add this
  },

  contracts: {
    nft: process.env.NFT_CONTRACT_ADDRESS,
    oracle: process.env.ORACLE_CONTRACT_ADDRESS,
    marketplace: process.env.MARKETPLACE_CONTRACT_ADDRESS,
    yield: process.env.YIELD_CONTRACT_ADDRESS,
  },

  cricapi: {
    key: process.env.CRICAPI_KEY,
    seriesId: process.env.PSL_SERIES_ID,
    baseUrl: 'https://api.cricapi.com/v1',
  },

  pinata: {
    apiKey: process.env.PINATA_API_KEY,
    secretKey: process.env.PINATA_SECRET_KEY,
    gateway: 'https://gateway.pinata.cloud/ipfs',
  },
});
