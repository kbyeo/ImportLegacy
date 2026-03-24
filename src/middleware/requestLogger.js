const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      type: 'http_request',
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
    });
  });

  next();
}

module.exports = requestLogger;
