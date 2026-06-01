import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecret-cbdc-smartbank-wallet-key-2026',
    accessExpires: parseInt(process.env.JWT_ACCESS_EXPIRES || '3600', 10),
    refreshExpires: parseInt(process.env.JWT_REFRESH_EXPIRES || '604800', 10),
  },
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'smartbank_wallet',
    useInMemory: process.env.USE_IN_MEMORY_DB === 'true',
  },
  centralBank: {
    url: process.env.CENTRAL_BANK_CORE_URL || 'http://localhost:8080',
    mock: process.env.MOCK_CENTRAL_BANK === 'true',
  },
  cbdc: {
    cooldownSeconds: parseInt(process.env.COOLDOWN_SECONDS || '10', 10),
    dailyLimitCount: parseInt(process.env.DAILY_LIMIT_COUNT || '10', 10),
  }
};
