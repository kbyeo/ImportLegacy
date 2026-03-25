# Legacy Customer Data Import System

A Node.js REST API for bulk-importing customer records from CSV files into MongoDB via an async BullMQ job queue. Built to support a legacy CRM migration with production-grade validation, error handling, and observability.

## Quick Start

```bash
cp .env.example .env
docker-compose up --build
```

That's it. Docker Compose starts the app, MongoDB, and Redis together. The API is available at `http://localhost:3000`.

## Prerequisites

- Docker v20+
- Docker Compose v2+
- For local development and testing: Node.js v20 LTS, npm

## API Usage Examples

### Upload a CSV file

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@customers.csv"
```

Response `202 Accepted`:

```json
{
  "success": true,
  "message": "File uploaded successfully. Import job has been queued.",
  "data": {
    "jobId": "664a1f3e2b1c4d0012ab3456",
    "status": "pending"
  }
}
```

### Check import status

```bash
curl http://localhost:3000/api/imports/664a1f3e2b1c4d0012ab3456
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "_id": "664a1f3e2b1c4d0012ab3456",
    "status": "completed",
    "originalFilename": "customers.csv",
    "totalRecords": 100,
    "successCount": 97,
    "failureCount": 3,
    "rejectedRecords": [
      {
        "row": 4,
        "data": { "full_name": "", "email": "bad", "date_of_birth": "1990-01-01", "timezone": "America/New_York" },
        "errors": ["full_name is required", "Invalid email format: 'bad'"]
      }
    ],
    "startedAt": "2024-05-20T10:00:01.000Z",
    "completedAt": "2024-05-20T10:00:03.412Z"
  }
}
```

### List customers

```bash
# Paginated list
curl "http://localhost:3000/api/customers?page=1&limit=10"

# Filter by partial name (case-insensitive)
curl "http://localhost:3000/api/customers?fullName=John"

# Filter by exact email
curl "http://localhost:3000/api/customers?email=john@example.com"
```

Response `200 OK`:

```json
{
  "success": true,
  "data": [
    {
      "_id": "664a1f3e2b1c4d0012ab0001",
      "fullName": "John Smith",
      "email": "john@example.com",
      "dateOfBirth": "1990-05-15T00:00:00.000Z",
      "timezone": "America/New_York",
      "createdAt": "2024-05-20T10:00:02.000Z",
      "updatedAt": "2024-05-20T10:00:02.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalRecords": 97,
    "totalPages": 10,
    "skip": 0
  }
}
```

### Get a single customer

```bash
curl http://localhost:3000/api/customers/664a1f3e2b1c4d0012ab0001
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "_id": "664a1f3e2b1c4d0012ab0001",
    "fullName": "John Smith",
    "email": "john@example.com",
    "dateOfBirth": "1990-05-15T00:00:00.000Z",
    "timezone": "America/New_York",
    "createdAt": "2024-05-20T10:00:02.000Z",
    "updatedAt": "2024-05-20T10:00:02.000Z"
  }
}
```

### Full update (PUT)

Replaces all fields. All four fields are required.

```bash
curl -X PUT http://localhost:3000/api/customers/664a1f3e2b1c4d0012ab0001 \
  -H "Content-Type: application/json" \
  -d '{"full_name":"John Updated","email":"john@example.com","date_of_birth":"1990-05-15","timezone":"America/New_York"}'
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "_id": "664a1f3e2b1c4d0012ab0001",
    "fullName": "John Updated",
    "email": "john@example.com",
    "dateOfBirth": "1990-05-15T00:00:00.000Z",
    "timezone": "America/New_York",
    "updatedAt": "2024-05-20T11:30:00.000Z"
  }
}
```

### Partial update (PATCH)

Updates only the fields provided.

```bash
curl -X PATCH http://localhost:3000/api/customers/664a1f3e2b1c4d0012ab0001 \
  -H "Content-Type: application/json" \
  -d '{"full_name":"John Patched"}'
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "_id": "664a1f3e2b1c4d0012ab0001",
    "fullName": "John Patched",
    "email": "john@example.com",
    "dateOfBirth": "1990-05-15T00:00:00.000Z",
    "timezone": "America/New_York",
    "updatedAt": "2024-05-20T11:31:00.000Z"
  }
}
```

### Delete a customer

```bash
curl -X DELETE http://localhost:3000/api/customers/664a1f3e2b1c4d0012ab0001
```

Response `204 No Content` (empty body).

### Error response example

```bash
curl http://localhost:3000/api/customers/invalid-id
```

Response `400 Bad Request`:

```json
{
  "success": false,
  "error": {
    "message": "Invalid ID: 'invalid-id'",
    "code": "INVALID_ID",
    "details": []
  }
}
```

All error responses follow this shape. Error codes: `VALIDATION_ERROR` (400), `INVALID_ID` (400), `NOT_FOUND` (404), `DUPLICATE_EMAIL` (409), `NO_FILE` (400), `INVALID_FILE_TYPE` (400), `INTERNAL_ERROR` (500).

## Testing

```bash
npm install
npm test                  # All tests
npm run test:coverage     # With coverage report
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
```

Tests use `mongodb-memory-server` and `ioredis-mock`. No external services are needed.

## Project Structure

```
.
├── Dockerfile                  # Production image (node:20-alpine)
├── docker-compose.yml          # App + MongoDB 7 + Redis 7 with healthchecks
├── .env.example                # All environment variables documented
├── jest.config.js              # Jest configuration
├── package.json
├── src/
│   ├── app.js                  # Express app setup, middleware, route mounting
│   ├── server.js               # Entry point: DB connect, worker start, HTTP listen
│   ├── config/
│   │   └── index.js            # Centralised env var loading with defaults
│   ├── models/
│   │   ├── Customer.js         # Mongoose schema: fullName, email (unique), dateOfBirth, timezone
│   │   └── ImportJob.js        # Mongoose schema: status, counts, rejectedRecords
│   ├── routes/
│   │   ├── upload.routes.js    # POST /api/upload
│   │   ├── import.routes.js    # GET /api/imports/:jobId
│   │   └── customer.routes.js  # GET/PUT/PATCH/DELETE /api/customers
│   ├── controllers/
│   │   ├── upload.controller.js    # Receive file, create ImportJob, enqueue
│   │   ├── import.controller.js    # Return ImportJob status by ID
│   │   └── customer.controller.js  # CRUD operations, delegate to service
│   ├── services/
│   │   ├── csv.service.js      # Stream-based CSV parser, emits { row, data }
│   │   ├── import.service.js   # Core pipeline: validate, batch insert, update job
│   │   └── customer.service.js # Customer queries, validation, uniqueness checks
│   ├── validators/
│   │   └── record.validator.js # validateRecord and validatePartialRecord (shared)
│   ├── workers/
│   │   └── import.worker.js    # BullMQ worker, calls import.service
│   ├── queues/
│   │   └── import.queue.js     # BullMQ Queue + ioredis connection + enqueueImportJob
│   ├── middleware/
│   │   ├── errorHandler.js     # Global error handler, maps errors to JSON responses
│   │   ├── upload.js           # Multer config: disk storage, CSV filter, size limit
│   │   └── requestLogger.js    # Winston HTTP request logging via res.on('finish')
│   └── utils/
│       ├── logger.js           # Winston JSON logger
│       ├── ApiError.js         # Operational error class with statusCode and code
│       └── pagination.js       # paginate(page, limit, total) with clamping
├── tests/
│   ├── setup.js                # MongoMemoryServer + ioredis-mock global setup
│   ├── unit/
│   │   ├── validator.test.js   # All validation rules, multi-error, partial validation
│   │   ├── csv.service.test.js # Parsing, empty files, malformed input, row numbers
│   │   └── pagination.test.js  # Edge cases: page 0, limit > 100, zero total
│   ├── integration/
│   │   ├── upload.test.js      # POST /api/upload: 202, 400 cases, DB document created
│   │   ├── import.test.js      # Import status endpoint + processImportJob pipeline
│   │   └── customer.test.js    # Full CRUD: list, filter, get, put, patch, delete
│   └── fixtures/
│       ├── valid.csv           # 5 fully valid rows
│       ├── invalid.csv         # 5 rows with distinct validation errors
│       ├── mixed.csv           # 10 rows: 7 valid, 3 invalid
│       ├── large.csv           # 1100 valid rows for load testing
│       ├── empty.csv           # 0 bytes
│       ├── malformed.csv       # Wrong headers, unclosed quotes
│       └── duplicates.csv      # 5 rows with 1 in-file duplicate email
└── uploads/                    # Multer write destination (temp files, auto-deleted)
```

## Design Decisions

**BullMQ for async job processing.** CSV imports can take seconds to minutes depending on file size. Accepting the upload synchronously and processing it in the background keeps the HTTP response fast, decouples the upload from the processing, and gives built-in retry logic for transient failures.

**Node.js stream-based CSV parsing.** The `csv-parse` streaming API processes the file row by row rather than loading the entire content into memory. This keeps memory usage constant regardless of file size, making 50 MB uploads as safe as 1 KB ones.

**`insertMany` with `{ ordered: false }`.** A single duplicate email in a batch should not abort the remaining inserts. With `ordered: false`, MongoDB continues past write errors, and the BulkWriteError response contains exactly which documents failed so they can be recorded as rejected without discarding the successful ones.

**Winston for structured JSON logging.** Every log line is a JSON object with a timestamp, level, and context fields. This format pipes directly into log aggregators (Datadog, Loki, CloudWatch) without a parsing step.

**Helmet and express-rate-limit.** Helmet sets security-relevant HTTP headers on every response. The rate limiter on the upload endpoint (10 requests per minute per IP) prevents the queue from being flooded, which would degrade processing time for legitimate jobs.

**`mongodb-memory-server` and `ioredis-mock` for tests.** Tests start and stop a real in-memory MongoDB instance automatically. This exercises actual Mongoose queries, indexes, and constraint errors without any external infrastructure. The ioredis mock prevents network calls to Redis. The result is a test suite that runs in isolation on any machine with Node.js installed.

**Routes, controllers, services, models.** Each layer has a single responsibility. Routes handle HTTP binding. Controllers parse requests and format responses. Services contain business logic and own database queries. Models define the schema. This structure makes each layer independently testable and replaceable.

## Assumptions and Limitations

- No authentication or authorization is applied to any endpoint. This was out of scope.
- MongoDB and Redis run without authentication, which is appropriate for development and assessment but not for production without additional hardening.
- Redis runs as a single node. BullMQ supports Redis Cluster but that is not configured here.
- Uploaded files are limited to 50 MB by default. This is configurable via the `MAX_FILE_SIZE_MB` environment variable.
- The import worker runs in the same process as the HTTP server. Horizontal worker scaling requires extracting the worker to a separate process.
- CSV files must use the exact column headers `full_name`, `email`, `date_of_birth`, and `timezone`. Files with different headers will produce zero successful imports.
- Dates must be in ISO 8601 format (`YYYY-MM-DD`). Other formats will fail validation.

## Future Improvements

- WebSocket or Server-Sent Events for real-time import progress updates
- JWT-based authentication and role-based access control
- S3 or cloud object storage for uploaded files instead of local disk
- Horizontal worker scaling by running the worker as a standalone process
- Per-record retry logic for transiently failed database writes
- CSV export endpoint for rejected records to allow bulk correction and re-upload
- Webhook notifications when an import job reaches a terminal state
- OpenAPI/Swagger documentation generated from route definitions
- A formal database migration strategy for schema evolution
- CI/CD pipeline configuration with test, lint, and build stages
