const { createLogger, format, transports } = require('winston');
const config = require('../config');

const logger = createLogger({
  level: config.LOG_LEVEL,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console(),
  ],
});

module.exports = logger;
