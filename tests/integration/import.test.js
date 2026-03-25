// Prevent BullMQ from touching Redis when app loads the upload route.
jest.mock('../../src/queues/import.queue', () => ({
  enqueueImportJob: jest.fn().mockResolvedValue({ id: 'mock-bull-id' }),
  importQueue: {},
  connection: { on: jest.fn() },
}));

const path = require('path');
const fs = require('fs');
const os = require('os');
const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../../src/app');
const ImportJob = require('../../src/models/ImportJob');
const { processImportJob } = require('../../src/services/import.service');

const FIXTURES = path.join(__dirname, '../fixtures');

// Copy a fixture to a temp path so processImportJob can safely delete it
// without affecting the original fixture file.
function copyFixture(name) {
  const src = path.join(FIXTURES, name);
  const dest = path.join(os.tmpdir(), `test-${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`);
  fs.copyFileSync(src, dest);
  return dest;
}

// ── GET /api/imports/:jobId ───────────────────────────────────────────────────

describe('GET /api/imports/:jobId', () => {
  it('returns 200 with full job data for a valid jobId', async () => {
    const job = await ImportJob.create({
      status: 'pending',
      originalFilename: 'test.csv',
      filePath: '/tmp/test.csv',
    });

    const res = await request(app).get(`/api/imports/${job._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(job._id.toString());
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.originalFilename).toBe('test.csv');
  });

  it('returns 404 for a valid but nonexistent jobId', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/imports/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 INVALID_ID for a malformed jobId', async () => {
    const res = await request(app).get('/api/imports/not-an-id');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });

  it('includes rejectedRecords array in the response', async () => {
    const job = await ImportJob.create({
      status: 'completed',
      originalFilename: 'done.csv',
      filePath: '/tmp/done.csv',
      totalRecords: 5,
      successCount: 4,
      failureCount: 1,
      rejectedRecords: [{ row: 3, data: { email: 'bad' }, errors: ['Invalid email'] }],
    });

    const res = await request(app).get(`/api/imports/${job._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.rejectedRecords).toHaveLength(1);
    expect(res.body.data.rejectedRecords[0].row).toBe(3);
  });
});

// ── processImportJob with mixed.csv ──────────────────────────────────────────

describe('processImportJob() with mixed.csv', () => {
  // mixed.csv has 10 rows: 7 valid, 3 invalid
  // Invalid: row 3 (empty name), row 6 (bad email), row 8 (future DOB)

  it('processes mixed.csv and sets correct counts on the ImportJob', async () => {
    const job = await ImportJob.create({
      status: 'pending',
      originalFilename: 'mixed.csv',
      filePath: copyFixture('mixed.csv'),
    });

    await processImportJob(job._id.toString(), job.filePath);

    const updated = await ImportJob.findById(job._id);
    expect(updated.status).toBe('completed');
    expect(updated.totalRecords).toBe(10);
    expect(updated.successCount).toBe(7);
    expect(updated.failureCount).toBe(3);
    expect(updated.rejectedRecords).toHaveLength(3);
    expect(updated.startedAt).toBeDefined();
    expect(updated.completedAt).toBeDefined();
  });

  it('populates rejectedRecords with row numbers and error messages', async () => {
    const job = await ImportJob.create({
      status: 'pending',
      originalFilename: 'mixed.csv',
      filePath: copyFixture('mixed.csv'),
    });

    await processImportJob(job._id.toString(), job.filePath);

    const updated = await ImportJob.findById(job._id);
    const rejected = updated.rejectedRecords;

    // Each rejected entry must have row, data, and errors
    for (const entry of rejected) {
      expect(entry.row).toBeGreaterThan(0);
      expect(entry.errors.length).toBeGreaterThan(0);
    }

    // Row 3 had empty full_name
    const row3 = rejected.find((r) => r.row === 3);
    expect(row3).toBeDefined();
    expect(row3.errors.some((e) => e.includes('full_name'))).toBe(true);

    // Row 6 had invalid email
    const row6 = rejected.find((r) => r.row === 6);
    expect(row6).toBeDefined();
    expect(row6.errors.some((e) => e.toLowerCase().includes('email'))).toBe(true);
  });

  it('can retrieve the completed job via GET /api/imports/:jobId', async () => {
    const job = await ImportJob.create({
      status: 'pending',
      originalFilename: 'mixed.csv',
      filePath: copyFixture('mixed.csv'),
    });

    await processImportJob(job._id.toString(), job.filePath);

    const res = await request(app).get(`/api/imports/${job._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.successCount).toBe(7);
    expect(res.body.data.failureCount).toBe(3);
  });
});

// ── processImportJob with duplicates.csv ──────────────────────────────────────

describe('processImportJob() with duplicates.csv', () => {
  // duplicates.csv has 5 rows:
  // rows 1,2,4,5 are unique and valid → successCount 4
  // row 3 shares email with row 2 → rejected as in-file duplicate

  it('rejects the duplicate email and records correct counts', async () => {
    const job = await ImportJob.create({
      status: 'pending',
      originalFilename: 'duplicates.csv',
      filePath: copyFixture('duplicates.csv'),
    });

    await processImportJob(job._id.toString(), job.filePath);

    const updated = await ImportJob.findById(job._id);
    expect(updated.status).toBe('completed');
    expect(updated.totalRecords).toBe(5);
    expect(updated.successCount).toBe(4);
    expect(updated.failureCount).toBe(1);
    expect(updated.rejectedRecords).toHaveLength(1);
  });

  it('records the duplicate email error in rejectedRecords', async () => {
    const job = await ImportJob.create({
      status: 'pending',
      originalFilename: 'duplicates.csv',
      filePath: copyFixture('duplicates.csv'),
    });

    await processImportJob(job._id.toString(), job.filePath);

    const updated = await ImportJob.findById(job._id);
    const [rejected] = updated.rejectedRecords;

    expect(rejected.row).toBe(3); // "Duplicate Two" is row 3
    expect(rejected.errors.some((e) => e.toLowerCase().includes('duplicate'))).toBe(true);
    expect(rejected.errors.some((e) => e.includes('duplicate@example.com'))).toBe(true);
  });
});

// ── processImportJob with valid.csv ───────────────────────────────────────────

describe('processImportJob() with valid.csv', () => {
  it('imports all 5 records with no rejections', async () => {
    const job = await ImportJob.create({
      status: 'pending',
      originalFilename: 'valid.csv',
      filePath: copyFixture('valid.csv'),
    });

    await processImportJob(job._id.toString(), job.filePath);

    const updated = await ImportJob.findById(job._id);
    expect(updated.status).toBe('completed');
    expect(updated.totalRecords).toBe(5);
    expect(updated.successCount).toBe(5);
    expect(updated.failureCount).toBe(0);
    expect(updated.rejectedRecords).toHaveLength(0);
  });
});
