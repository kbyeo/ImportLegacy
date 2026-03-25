// Prevent BullMQ from touching Redis when app loads the upload route.
jest.mock('../../src/queues/import.queue', () => ({
  enqueueImportJob: jest.fn().mockResolvedValue({ id: 'mock-bull-id' }),
  importQueue: {},
  connection: { on: jest.fn() },
}));

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Customer = require('../../src/models/Customer');

// ── Seed helpers ──────────────────────────────────────────────────────────────

async function seedCustomers(docs) {
  return Customer.insertMany(docs);
}

const BASE_CUSTOMERS = [
  {
    fullName: 'Alice Johnson',
    email: 'alice@test.com',
    dateOfBirth: new Date('1985-03-15'),
    timezone: 'America/New_York',
  },
  {
    fullName: 'Bob Smith',
    email: 'bob@test.com',
    dateOfBirth: new Date('1990-06-20'),
    timezone: 'Europe/London',
  },
  {
    fullName: 'Carol Williams',
    email: 'carol@test.com',
    dateOfBirth: new Date('1978-11-05'),
    timezone: 'Asia/Tokyo',
  },
];

// ── GET /api/customers ────────────────────────────────────────────────────────

describe('GET /api/customers', () => {
  beforeEach(() => seedCustomers(BASE_CUSTOMERS));

  it('returns 200 with a list of customers and a pagination object', async () => {
    const res = await request(app).get('/api/customers');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(3);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.totalRecords).toBe(3);
  });

  it('respects page and limit query params', async () => {
    const res = await request(app).get('/api/customers?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.limit).toBe(2);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination.totalRecords).toBe(3);
  });

  it('filters by fullName (case-insensitive partial match)', async () => {
    const res = await request(app).get('/api/customers?fullName=alice');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].fullName).toBe('Alice Johnson');
  });

  it('filters by fullName partial match mid-name', async () => {
    const res = await request(app).get('/api/customers?fullName=son');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.some((c) => c.fullName === 'Alice Johnson')).toBe(true);
  });

  it('filters by exact email', async () => {
    const res = await request(app).get('/api/customers?email=bob@test.com');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].email).toBe('bob@test.com');
  });

  it('returns empty data array when no customers match the filter', async () => {
    const res = await request(app).get('/api/customers?email=nobody@nowhere.com');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.pagination.totalRecords).toBe(0);
  });
});

// ── GET /api/customers/:id ────────────────────────────────────────────────────

describe('GET /api/customers/:id', () => {
  let customer;

  beforeEach(async () => {
    [customer] = await seedCustomers([BASE_CUSTOMERS[0]]);
  });

  it('returns 200 with the customer when id is valid', async () => {
    const res = await request(app).get(`/api/customers/${customer._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('alice@test.com');
    expect(res.body.data.fullName).toBe('Alice Johnson');
  });

  it('returns 400 with INVALID_ID for a malformed id', async () => {
    const res = await request(app).get('/api/customers/not-an-object-id');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_ID');
  });

  it('returns 404 with NOT_FOUND for a valid but nonexistent id', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/customers/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ── PUT /api/customers/:id ────────────────────────────────────────────────────

describe('PUT /api/customers/:id', () => {
  let alice;
  let bob;

  beforeEach(async () => {
    [alice, bob] = await seedCustomers(BASE_CUSTOMERS.slice(0, 2));
  });

  it('returns 200 with updated data on a valid PUT', async () => {
    const res = await request(app)
      .put(`/api/customers/${alice._id}`)
      .send({
        full_name: 'Alice Updated',
        email: 'alice.updated@test.com',
        date_of_birth: '1985-03-15',
        timezone: 'America/Chicago',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe('Alice Updated');
    expect(res.body.data.email).toBe('alice.updated@test.com');
    expect(res.body.data.timezone).toBe('America/Chicago');
  });

  it('returns 400 VALIDATION_ERROR when a required field is missing', async () => {
    const res = await request(app)
      .put(`/api/customers/${alice._id}`)
      .send({
        // full_name is intentionally missing
        email: 'alice@test.com',
        date_of_birth: '1985-03-15',
        timezone: 'America/New_York',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.includes('full_name'))).toBe(true);
  });

  it('returns 409 DUPLICATE_EMAIL when email belongs to another customer', async () => {
    const res = await request(app)
      .put(`/api/customers/${alice._id}`)
      .send({
        full_name: 'Alice Johnson',
        email: 'bob@test.com', // Bob's email
        date_of_birth: '1985-03-15',
        timezone: 'America/New_York',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
  });

  it('allows a PUT that keeps the same email on the same customer', async () => {
    const res = await request(app)
      .put(`/api/customers/${alice._id}`)
      .send({
        full_name: 'Alice Johnson',
        email: 'alice@test.com', // same email, same customer
        date_of_birth: '1985-03-15',
        timezone: 'America/New_York',
      });

    expect(res.status).toBe(200);
  });

  it('returns 404 for a valid but nonexistent id', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/customers/${fakeId}`)
      .send({
        full_name: 'Ghost',
        email: 'ghost@test.com',
        date_of_birth: '1990-01-01',
        timezone: 'America/New_York',
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ── PATCH /api/customers/:id ──────────────────────────────────────────────────

describe('PATCH /api/customers/:id', () => {
  let alice;
  let bob;

  beforeEach(async () => {
    [alice, bob] = await seedCustomers(BASE_CUSTOMERS.slice(0, 2));
  });

  it('returns 200 and updates only the provided field', async () => {
    const res = await request(app)
      .patch(`/api/customers/${alice._id}`)
      .send({ full_name: 'Alice Patched' });

    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toBe('Alice Patched');
    // Other fields should remain unchanged
    expect(res.body.data.email).toBe('alice@test.com');
  });

  it('returns 409 DUPLICATE_EMAIL on PATCH with another customer email', async () => {
    const res = await request(app)
      .patch(`/api/customers/${alice._id}`)
      .send({ email: 'bob@test.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
  });

  it('returns 400 VALIDATION_ERROR when patching with an invalid email', async () => {
    const res = await request(app)
      .patch(`/api/customers/${alice._id}`)
      .send({ email: 'not-valid' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 INVALID_ID for a bad id format', async () => {
    const res = await request(app)
      .patch('/api/customers/bad-id')
      .send({ full_name: 'X' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });
});

// ── DELETE /api/customers/:id ─────────────────────────────────────────────────

describe('DELETE /api/customers/:id', () => {
  let customer;

  beforeEach(async () => {
    [customer] = await seedCustomers([BASE_CUSTOMERS[0]]);
  });

  it('returns 204 No Content on successful delete', async () => {
    const res = await request(app).delete(`/api/customers/${customer._id}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('actually removes the customer from the database', async () => {
    await request(app).delete(`/api/customers/${customer._id}`);
    const found = await Customer.findById(customer._id);
    expect(found).toBeNull();
  });

  it('returns 404 when the customer does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/customers/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 INVALID_ID for a malformed id', async () => {
    const res = await request(app).delete('/api/customers/not-valid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });
});
