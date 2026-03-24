const mongoose = require('mongoose');
const ImportJob = require('../models/ImportJob');
const ApiError = require('../utils/ApiError');

async function getImportStatus(req, res, next) {
  try {
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new ApiError(400, `Invalid job ID: '${jobId}'`, 'INVALID_ID');
    }

    const importJob = await ImportJob.findById(jobId).lean();
    if (!importJob) {
      throw new ApiError(404, `Import job not found: '${jobId}'`, 'NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: importJob,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getImportStatus };
