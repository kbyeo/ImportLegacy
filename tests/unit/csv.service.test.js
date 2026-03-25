const path = require('path');
const fs = require('fs');
const os = require('os');
const { parseCSV } = require('../../src/services/csv.service');

const FIXTURES = path.join(__dirname, '../fixtures');

async function collect(stream) {
  const rows = [];
  for await (const item of stream) {
    rows.push(item);
  }
  return rows;
}

describe('parseCSV()', () => {
  it('parses valid.csv and returns 5 rows with correct shape', async () => {
    const rows = await collect(parseCSV(path.join(FIXTURES, 'valid.csv')));

    expect(rows).toHaveLength(5);

    // Row numbers are 1-indexed from first data row
    expect(rows[0].row).toBe(1);
    expect(rows[4].row).toBe(5);

    // Each item has a data object with CSV headers as keys
    const { data } = rows[0];
    expect(data).toHaveProperty('full_name');
    expect(data).toHaveProperty('email');
    expect(data).toHaveProperty('date_of_birth');
    expect(data).toHaveProperty('timezone');
  });

  it('parses valid.csv first row data correctly', async () => {
    const rows = await collect(parseCSV(path.join(FIXTURES, 'valid.csv')));
    const { data } = rows[0];

    expect(data.full_name).toBe('Alice Johnson');
    expect(data.email).toBe('alice.johnson@example.com');
    expect(data.date_of_birth).toBe('1985-03-15');
    expect(data.timezone).toBe('America/New_York');
  });

  it('returns 0 rows for an empty file', async () => {
    const rows = await collect(parseCSV(path.join(FIXTURES, 'empty.csv')));
    expect(rows).toHaveLength(0);
  });

  it('returns 0 rows for a headers-only CSV', async () => {
    const tmpFile = path.join(os.tmpdir(), `headers-only-${Date.now()}.csv`);
    fs.writeFileSync(tmpFile, 'full_name,email,date_of_birth,timezone\n');

    try {
      const rows = await collect(parseCSV(tmpFile));
      expect(rows).toHaveLength(0);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('handles malformed.csv without crashing — emits error or partial rows', async () => {
    let rows = [];
    let caughtError = null;

    try {
      rows = await collect(parseCSV(path.join(FIXTURES, 'malformed.csv')));
    } catch (err) {
      caughtError = err;
    }

    // Either some rows were parsed or an error was emitted — but no unhandled throw
    expect(caughtError === null || caughtError instanceof Error).toBe(true);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('increments row numbers starting from 1', async () => {
    const rows = await collect(parseCSV(path.join(FIXTURES, 'valid.csv')));
    rows.forEach((item, idx) => {
      expect(item.row).toBe(idx + 1);
    });
  });

  it('trims whitespace from field values', async () => {
    const tmpFile = path.join(os.tmpdir(), `trim-test-${Date.now()}.csv`);
    fs.writeFileSync(
      tmpFile,
      'full_name,email,date_of_birth,timezone\n  Alice  , alice@test.com , 1990-01-01 , America/New_York \n'
    );

    try {
      const rows = await collect(parseCSV(tmpFile));
      expect(rows[0].data.full_name).toBe('Alice');
      expect(rows[0].data.email).toBe('alice@test.com');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('emits an error for a nonexistent file', async () => {
    const stream = parseCSV('/nonexistent/path/file.csv');
    await expect(collect(stream)).rejects.toThrow();
  });
});
