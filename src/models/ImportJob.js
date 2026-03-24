const mongoose = require('mongoose');

const importJobSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    originalFilename: {
      type: String,
      required: [true, 'originalFilename is required'],
    },
    filePath: {
      type: String,
      required: [true, 'filePath is required'],
    },
    totalRecords: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    rejectedRecords: [
      {
        row: Number,
        data: Object,
        errors: [String],
      },
    ],
    startedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ImportJob', importJobSchema);
