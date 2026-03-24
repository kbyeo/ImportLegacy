const { Worker } = require('bullmq');
const { connection } = require('../queues/import.queue');
const { processImportJob } = require('../services/import.service');
const config = require('../config');
const logger = require('../utils/logger');

let worker = null;

/**
 * Starts the BullMQ worker. Must be called explicitly, not auto-started on require.
 * @returns {Worker}
 */
function startWorker() {
  if (worker) return worker;

  worker = new Worker(
    'csv-import',
    async (job) => {
      const { jobId, filePath } = job.data;
      logger.info({ message: 'Worker picked up job', bullJobId: job.id, jobId, filePath });
      await processImportJob(jobId, filePath);
    },
    {
      connection,
      concurrency: config.WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ message: 'Worker job completed', bullJobId: job.id, jobId: job.data.jobId });
  });

  worker.on('failed', (job, err) => {
    logger.error({
      message: 'Worker job failed',
      bullJobId: job && job.id,
      jobId: job && job.data && job.data.jobId,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error({ message: 'Worker encountered an error', error: err.message });
  });

  logger.info({
    message: 'Import worker started',
    concurrency: config.WORKER_CONCURRENCY,
  });

  return worker;
}

/**
 * Gracefully shuts down the worker. Used in tests and on process shutdown.
 */
async function closeWorker() {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info({ message: 'Import worker closed' });
  }
}

module.exports = { startWorker, closeWorker };
