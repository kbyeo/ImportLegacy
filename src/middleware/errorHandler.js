const mongoose = require('mongoose');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details = [];

  if (err instanceof ApiError && err.isOperational) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details || [];
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid value for field '${err.path}': '${err.value}'`;
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    code = err.code === 'LIMIT_FILE_SIZE' ? 'VALIDATION_ERROR' : 'VALIDATION_ERROR';
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File too large. Maximum size is ${err.field || 'the configured limit'}`
        : err.message;
  } else {
    logger.error({
      message: 'Unhandled error',
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  const response = {
    success: false,
    error: {
      message,
      code,
      details,
    },
  };

  if (process.env.NODE_ENV !== 'production' && !(err instanceof ApiError)) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
