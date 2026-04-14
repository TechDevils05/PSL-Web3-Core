import Joi from "joi";

export const envSchema = Joi.object({
  // Blockchain
  PRIVATE_KEY: Joi.string().required(),
  RPC_URL: Joi.string().uri().default("http://127.0.0.1:8545"),
  SCOUTING_POOL_ADDRESS: Joi.string().allow("").default(""),
  MOCK_WFT_ADDRESS: Joi.string().allow("").default(""),

  // Pinata (optional — service degrades gracefully)
  PINATA_API_KEY: Joi.string().allow("").default(""),
  PINATA_SECRET_KEY: Joi.string().allow("").default(""),

  // API
  PORT: Joi.number().default(3000),
});
