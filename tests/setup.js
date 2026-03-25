// Mock ioredis with ioredis-mock BEFORE any module loads it.
// jest.mock in setupFilesAfterEnv registers the factory in Jest's module
// registry so that every subsequent require('ioredis') returns the mock.
jest.mock('ioredis', () => {
  const IORedisMock = require('ioredis-mock');
  return IORedisMock;
});

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;

  await mongoose.connect(uri);
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
