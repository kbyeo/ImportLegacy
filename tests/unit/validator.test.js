const { validateRecord, validatePartialRecord } = require('../../src/validators/record.validator');

// Helper: today as YYYY-MM-DD
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Helper: a guaranteed past date
const VALID_DOB = '1990-06-15';
const VALID_TZ = 'America/New_York';

describe('validateRecord()', () => {
  // ── Happy path ─────────────────────────────────────────────────────────────

  it('returns valid:true for a fully valid record', () => {
    const result = validateRecord({
      full_name: 'John Doe',
      email: 'john@test.com',
      date_of_birth: VALID_DOB,
      timezone: VALID_TZ,
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  // ── full_name ───────────────────────────────────────────────────────────────

  it('errors when full_name is missing', () => {
    const { valid, errors } = validateRecord({
      email: 'a@b.com',
      date_of_birth: VALID_DOB,
      timezone: VALID_TZ,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('full_name'))).toBe(true);
  });

  it('errors when full_name is an empty string', () => {
    const { valid, errors } = validateRecord({
      full_name: '',
      email: 'a@b.com',
      date_of_birth: VALID_DOB,
      timezone: VALID_TZ,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('full_name'))).toBe(true);
  });

  it('errors when full_name is whitespace only', () => {
    const { valid, errors } = validateRecord({
      full_name: '   ',
      email: 'a@b.com',
      date_of_birth: VALID_DOB,
      timezone: VALID_TZ,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('full_name') && e.includes('non-empty'))).toBe(true);
  });

  it('errors when full_name is null', () => {
    const { valid, errors } = validateRecord({
      full_name: null,
      email: 'a@b.com',
      date_of_birth: VALID_DOB,
      timezone: VALID_TZ,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('full_name'))).toBe(true);
  });

  // ── email ───────────────────────────────────────────────────────────────────

  it('errors when email is missing', () => {
    const { valid, errors } = validateRecord({
      full_name: 'Jane',
      date_of_birth: VALID_DOB,
      timezone: VALID_TZ,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('email'))).toBe(true);
  });

  it('errors for "notanemail"', () => {
    const { valid, errors } = validateRecord({
      full_name: 'Jane',
      email: 'notanemail',
      date_of_birth: VALID_DOB,
      timezone: VALID_TZ,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("'notanemail'"))).toBe(true);
  });

  it('errors for "@missing.com"', () => {
    const { valid, errors } = validateRecord({
      full_name: 'Jane',
      email: '@missing.com',
      date_of_birth: VALID_DOB,
      timezone: VALID_TZ,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('email') || e.includes('@missing.com'))).toBe(true);
  });

  it('errors when email is an empty string', () => {
    const { valid, errors } = validateRecord({
      full_name: 'Jane',
      email: '',
      date_of_birth: VALID_DOB,
      timezone: VALID_TZ,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('email'))).toBe(true);
  });

  it('errors when email is null', () => {
    const { valid, errors } = validateRecord({
      full_name: 'Jane',
      email: null,
      date_of_birth: VALID_DOB,
      timezone: VALID_TZ,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('email'))).toBe(true);
  });

  it('accepts standard email formats', () => {
    const emails = ['user@domain.com', 'user.name@domain.com', 'user+tag@domain.com'];
    for (const email of emails) {
      const { valid } = validateRecord({
        full_name: 'Test',
        email,
        date_of_birth: VALID_DOB,
        timezone: VALID_TZ,
      });
      expect(valid).toBe(true);
    }
  });

  // ── date_of_birth ────────────────────────────────────────────────────────────

  it('errors when date_of_birth is missing', () => {
    const { valid, errors } = validateRecord({
      full_name: 'Jane',
      email: 'jane@test.com',
      timezone: VALID_TZ,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('date_of_birth'))).toBe(true);
  });

  it('errors when date_of_birth is in the future', () => {
    const { valid, errors } = validateRecord({
      full_name: 'Jane',
      email: 'jane@test.com',
      date_of_birth: '2099-01-01',
      timezone: VALID_TZ,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('in the past') && e.includes('2099-01-01'))).toBe(true);
  });

  it('errors when date_of_birth is today (must be strictly in the past)', () => {
    const today = todayStr();
    const { valid, errors } = validateRecord({
      full_name: 'Jane',
      email: 'jane@test.com',
      date_of_birth: today,
      timezone: VALID_TZ,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('in the past'))).toBe(true);
  });

  it('errors when date_of_birth is not a valid date string', () => {
    const { valid, errors } = validateRecord({
      full_name: 'Jane',
      email: 'jane@test.com',
      date_of_birth: 'not-a-date',
      timezone: VALID_TZ,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('valid date') && e.includes('not-a-date'))).toBe(true);
  });

  it('errors when date_of_birth year is before 1900', () => {
    const { valid, errors } = validateRecord({
      full_name: 'Jane',
      email: 'jane@test.com',
      date_of_birth: '1800-01-01',
      timezone: VALID_TZ,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('1800-01-01'))).toBe(true);
  });

  it('accepts a valid past date_of_birth', () => {
    const { valid } = validateRecord({
      full_name: 'Jane',
      email: 'jane@test.com',
      date_of_birth: '1985-12-31',
      timezone: VALID_TZ,
    });
    expect(valid).toBe(true);
  });

  // ── timezone ─────────────────────────────────────────────────────────────────

  it('errors when timezone is missing', () => {
    const { valid, errors } = validateRecord({
      full_name: 'Jane',
      email: 'jane@test.com',
      date_of_birth: VALID_DOB,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('timezone'))).toBe(true);
  });

  it('errors when timezone is empty string', () => {
    const { valid, errors } = validateRecord({
      full_name: 'Jane',
      email: 'jane@test.com',
      date_of_birth: VALID_DOB,
      timezone: '',
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('timezone'))).toBe(true);
  });

  it('errors for an invalid timezone "Fake/Zone"', () => {
    const { valid, errors } = validateRecord({
      full_name: 'Jane',
      email: 'jane@test.com',
      date_of_birth: VALID_DOB,
      timezone: 'Fake/Zone',
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('Invalid timezone') && e.includes('Fake/Zone'))).toBe(true);
  });

  it('errors for "Mars/Olympus"', () => {
    const { valid, errors } = validateRecord({
      full_name: 'Jane',
      email: 'jane@test.com',
      date_of_birth: VALID_DOB,
      timezone: 'Mars/Olympus',
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('Mars/Olympus'))).toBe(true);
  });

  it('accepts valid IANA timezones', () => {
    const timezones = ['America/New_York', 'Asia/Singapore', 'America/Chicago', 'Europe/London'];
    for (const timezone of timezones) {
      const { valid } = validateRecord({
        full_name: 'Test',
        email: 'test@test.com',
        date_of_birth: VALID_DOB,
        timezone,
      });
      expect(valid).toBe(true);
    }
  });

  // ── Multi-error ───────────────────────────────────────────────────────────────

  it('collects all 4 errors when every field is invalid — does not short-circuit', () => {
    const { valid, errors } = validateRecord({
      full_name: '',
      email: 'bad',
      date_of_birth: '2099-01-01',
      timezone: 'NotReal/Zone',
    });
    expect(valid).toBe(false);
    expect(errors).toHaveLength(4);
  });

  it('handles null record gracefully', () => {
    const { valid, errors } = validateRecord(null);
    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('validatePartialRecord()', () => {
  it('validates only the email field when only email is provided', () => {
    const { valid, errors } = validatePartialRecord({ email: 'bad-email' });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('email') || e.includes('bad-email'))).toBe(true);
    // Should NOT produce errors about full_name, date_of_birth, or timezone
    expect(errors.some((e) => e.includes('full_name'))).toBe(false);
    expect(errors.some((e) => e.includes('timezone'))).toBe(false);
  });

  it('returns valid:true when only full_name is provided and valid', () => {
    const { valid, errors } = validatePartialRecord({ full_name: 'Alice' });
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('errors when only full_name is provided but empty', () => {
    const { valid, errors } = validatePartialRecord({ full_name: '  ' });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('full_name'))).toBe(true);
  });

  it('returns valid:true for valid partial email', () => {
    const { valid } = validatePartialRecord({ email: 'valid@example.com' });
    expect(valid).toBe(true);
  });

  it('validates only provided fields and ignores absent ones', () => {
    // Only timezone is provided, and it is invalid
    const { valid, errors } = validatePartialRecord({ timezone: 'BadZone' });
    expect(valid).toBe(false);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('BadZone');
  });

  it('returns valid:true for empty object (no fields to validate)', () => {
    const { valid } = validatePartialRecord({});
    expect(valid).toBe(true);
  });
});
