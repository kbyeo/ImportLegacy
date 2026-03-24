const fs = require('fs');
const mongoose = require('mongoose');
const ImportJob = require('../models/ImportJob');
const Customer = require('../models/Customer');
const { parseCSV } = require('./csv.service');
const { validateRecord } = require('../validators/record.validator');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Flushes a batch of valid customer documents to MongoDB.
 * Handles BulkWriteError (code 11000) by moving duplicates to rejectedRecords.
 *
 * @param {object[]} batch - Array of Customer documents ready for insertMany.
 * @param {object[]} rejectedRecords - Mutable array; failed docs are appended here.
 * @returns {number} Number of successfully inserted records.
 */
async function flushBatch(batch, rejectedRecords) {
  if (batch.length === 0) return 0;

  try {
    const result = await Customer.insertMany(batch, { ordered: false });
    return result.length;
  } catch (err) {
    // BulkWriteError — some inserts may have succeeded
    if (err.name === 'MongoBulkWriteError' || (err.code === 11000 && err.writeErrors)) {
      const failedIndexes = new Set(err.writeErrors.map((e) => e.index));
      let successCount = 0;

      batch.forEach((doc, idx) => {
        if (failedIndexes.has(idx)) {
          rejectedRecords.push({
            row: doc._csvRow,
            data: doc._csvData,
            errors: [`Email already exists in database: '${doc.email}'`],
          });
        } else {
          successCount += 1;
        }
      });

      return successCount;
    }
    throw err;
  }
}

/**
 * Core import orchestration. Called by the BullMQ worker.
 * @param {string} jobId - MongoDB ImportJob _id as string.
 * @param {string} filePath - Path to the CSV file on disk.
 */
async function processImportJob(jobId, filePath) {
  let importJob;

  try {
    importJob = await ImportJob.findById(jobId);
    if (!importJob) {
      throw new Error(`ImportJob not found: ${jobId}`);
    }

    importJob.status = 'processing';
    importJob.startedAt = new Date();
    await importJob.save();

    logger.info({ message: 'Import processing started', jobId });

    const seenEmails = new Set();
    const rejectedRecords = [];
    let batch = [];
    let totalRecords = 0;
    let successCount = 0;

    const stream = parseCSV(filePath);

    for await (const { row, data } of stream) {
      totalRecords += 1;

      const { valid, errors } = validateRecord(data);

      if (!valid) {
        rejectedRecords.push({ row, data, errors });
        continue;
      }

      const emailNorm = data.email.trim().toLowerCase();

      if (seenEmails.has(emailNorm)) {
        rejectedRecords.push({
          row,
          data,
          errors: [`Duplicate email within file: '${emailNorm}'`],
        });
        continue;
      }

      seenEmails.add(emailNorm);

      // Attach row/data as non-persisted metadata for error recovery in flushBatch
      const doc = {
        fullName: data.full_name.trim(),
        email: emailNorm,
        dateOfBirth: new Date(data.date_of_birth),
        timezone: data.timezone.trim(),
        importJobId: new mongoose.Types.ObjectId(jobId),
        _csvRow: row,
        _csvData: data,
      };

      batch.push(doc);

      if (batch.length >= config.BATCH_SIZE) {
        const inserted = await flushBatch(batch, rejectedRecords);
        successCount += inserted;
        batch = [];
      }
    }

    // Flush remaining records
    if (batch.length > 0) {
      const inserted = await flushBatch(batch, rejectedRecords);
      successCount += inserted;
    }

    const failureCount = totalRecords - successCount;

    importJob.status = 'completed';
    importJob.completedAt = new Date();
    importJob.totalRecords = totalRecords;
    importJob.successCount = successCount;
    importJob.failureCount = failureCount;
    importJob.rejectedRecords = rejectedRecords;
    await importJob.save();

    logger.info({
      message: 'Import processing completed',
      jobId,
      totalRecords,
      successCount,
      failureCount,
    });
  } catch (err) {
    logger.error({ message: 'Import processing failed', jobId, error: err.message, stack: err.stack });

    if (importJob) {
      importJob.status = 'failed';
      await importJob.save().catch((saveErr) => {
        logger.error({ message: 'Failed to update ImportJob status to failed', error: saveErr.message });
      });
    }
  } finally {
    // Always attempt to clean up the temp file
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr && unlinkErr.code !== 'ENOENT') {
        logger.warn({ message: 'Could not delete temp CSV file', filePath, error: unlinkErr.message });
      }
    });
  }
}

module.exports = { processImportJob };
