const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'fullName is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'dateOfBirth is required'],
    },
    timezone: {
      type: String,
      required: [true, 'timezone is required'],
    },
    importJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImportJob',
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ fullName: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
