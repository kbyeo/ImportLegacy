const ImportJob = require('../models/ImportJob');
const { enqueueImportJob } = require('../queues/import.queue');
const ApiError = require('../utils/ApiError');

async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file provided. Please upload a CSV file.', 'NO_FILE');
    }

    const importJob = await ImportJob.create({
      status: 'pending',
      originalFilename: req.file.originalname,
      filePath: req.file.path,
    });

    await enqueueImportJob(importJob._id.toString(), req.file.path);

    res.status(202).json({
      success: true,
      message: 'File uploaded successfully. Import job has been queued.',
      data: {
        jobId: importJob._id,
        status: 'pending',
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadFile };
