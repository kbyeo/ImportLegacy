# Legacy Customer Data Import System

A production-grade Node.js backend for importing customer records from CSV files, built to support a legacy CRM migration.

## Quick Start

```bash
# Copy environment variables
cp .env.example .env

# Start all services
docker-compose up
```

The API will be available at `http://localhost:3000`.

## Running Locally (without Docker)

```bash
npm install
# Ensure MongoDB and Redis are running locally, then:
npm start
```

## Running Tests

```bash
npm test                  # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # With coverage report
```

No external services are required for tests — `mongodb-memory-server` and `ioredis-mock` are used automatically.

## API Reference

### Upload CSV

```
POST /api/upload
Content-Type: multipart/form-data
Body: file=<your-file.csv>
```

Returns `202 Accepted` with a `jobId` to track processing status.

### Check Import Status

```
GET /api/imports/:jobId
```

### List Customers

```
GET /api/customers?page=1&limit=10&email=&fullName=
```

### Get Customer

```
GET /api/customers/:id
```

### Update Customer (full replacement)

```
PUT /api/customers/:id
Content-Type: application/json
```

### Partial Update

```
PATCH /api/customers/:id
Content-Type: application/json
```

### Delete Customer

```
DELETE /api/customers/:id
```

## CSV Format

```csv
full_name,email,date_of_birth,timezone
Alice Johnson,alice@example.com,1985-03-15,America/New_York
```

| Field | Format | Notes |
|-------|--------|-------|
| `full_name` | String | Required, non-empty |
| `email` | RFC 5321 email | Required, unique |
| `date_of_birth` | YYYY-MM-DD | Must be in the past, year >= 1900 |
| `timezone` | IANA timezone | e.g. `America/New_York`, `Europe/London` |

## Future Improvements

- Add webhook notifications when an import job completes
- Support additional file formats (XLSX, JSON)
- Add admin dashboard for monitoring import jobs
- Implement rate limiting per API key rather than per IP
- Add bulk customer export endpoint
