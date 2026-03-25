// Mock the queue so BullMQ never touches (mock) Redis during upload tests.
// jest.mock is hoisted by Jest above all require() calls in this file.
jest.mock('../../src/queues/import.queue', () => ({
  enqueueImportJob: jest.fn().mockResolvedValue({ id: 'mock-bull-id' }),
  importQueue: {},
  connection: { on: jest.fn() },
}));

const path = require('path');
const request = require('supertest');
const app = require('../../src/app');
const ImportJob = require('../../src/models/ImportJob');

const FIXTURES = path.join(__dirname, '../fixtures');

describe('POST /api/upload', () => {
  it('returns 202 and a jobId when a valid CSV is uploaded', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', path.join(FIXTURES, 'valid.csv'));

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobId).toBeDefined();
    expect(res.body.data.status).toBe('pending');
    expect(res.body.message).toMatch(/queued/i);
  });

  it('creates an ImportJob document in MongoDB with status pending', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', path.join(FIXTURES, 'valid.csv'));

    expect(res.status).toBe(202);

    const job = await ImportJob.findById(res.body.data.jobId);
    expect(job).not.toBeNull();
    expect(job.status).toBe('pending');
    expect(job.originalFilename).toBe('valid.csv');
    expect(job.filePath).toBeDefined();
  });

  it('returns 400 with INVALID_FILE_TYPE when a non-CSV file is uploaded', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('not a csv'), { filename: 'data.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('returns 400 with NO_FILE when no file field is sent', async () => {
    const res = await request(app).post('/api/upload');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NO_FILE');
  });

  it('returns 202 for an empty CSV (job created, will result in 0 records when processed)', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', path.join(FIXTURES, 'empty.csv'));

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobId).toBeDefined();
  });

  it('stores the original filename on the ImportJob', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', path.join(FIXTURES, 'mixed.csv'));

    const job = await ImportJob.findById(res.body.data.jobId);
    expect(job.originalFilename).toBe('mixed.csv');
  });
});
