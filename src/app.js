const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

const uploadRoutes = require('./routes/upload.routes');
const importRoutes = require('./routes/import.routes');
const customerRoutes = require('./routes/customer.routes');

const ApiError = require('./utils/ApiError');

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitize MongoDB operator injection from req.body, req.query, req.params
app.use(mongoSanitize());

// HTTP request logging
app.use(requestLogger);

// Rate limiter: 10 requests per minute per IP on the upload endpoint
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many upload requests. Please try again later.',
      code: 'VALIDATION_ERROR',
      details: [],
    },
  },
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/customers', customerRoutes);

// 404 handler for unmatched routes
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));
});

// Global error handler — must be last
app.use(errorHandler);

module.exports = app;
