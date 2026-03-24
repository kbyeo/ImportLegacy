require('dotenv').config();

const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./utils/logger');
const app = require('./app');
const { startWorker, closeWorker } = require('./workers/import.worker');

let server;

async function start() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    logger.info({ message: 'MongoDB connected', uri: config.MONGODB_URI });

    startWorker();

    server = app.listen(config.PORT, () => {
      logger.info({ message: 'HTTP server listening', port: config.PORT, env: config.NODE_ENV });
    });
  } catch (err) {
    logger.error({ message: 'Failed to start server', error: err.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info({ message: `Received ${signal}, shutting down gracefully` });

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info({ message: 'HTTP server closed' });
    }

    await closeWorker();

    await mongoose.connection.close();
    logger.info({ message: 'MongoDB connection closed' });

    process.exit(0);
  } catch (err) {
    logger.error({ message: 'Error during shutdown', error: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ message: 'Unhandled promise rejection', reason: String(reason) });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error({ message: 'Uncaught exception', error: err.message, stack: err.stack });
  process.exit(1);
});

start();
