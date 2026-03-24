const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

const connection = new IORedis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  maxRetriesPerRequest: null, // Required by BullMQ
});

connection.on('error', (err) => {
  logger.error({ message: 'Redis connection error', error: err.message });
});

connection.on('connect', () => {
  logger.info({ message: 'Redis connected', host: config.REDIS_HOST, port: config.REDIS_PORT });
});

const importQueue = new Queue('csv-import', { connection });

/**
 * Adds a CSV import job to the BullMQ queue.
 * @param {string} jobId - The MongoDB ImportJob _id as a string.
 * @param {string} filePath - Path to the uploaded CSV file.
 * @returns {Promise<Job>} The created BullMQ job.
 */
async function enqueueImportJob(jobId, filePath) {
  const job = await importQueue.add(
    'process-csv',
    { jobId, filePath },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );
  logger.info({ message: 'Import job enqueued', jobId, bullJobId: job.id });
  return job;
}

module.exports = { importQueue, enqueueImportJob, connection };
