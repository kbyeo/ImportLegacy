require('dotenv').config();

const config = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/import-legacy',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY, 10) || 2,
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE, 10) || 100,
};

module.exports = config;
