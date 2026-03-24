const validatorLib = require('validator');

// Cache valid IANA timezones at module load for O(1) lookups
const VALID_TIMEZONES = new Set(Intl.supportedValuesOf('timeZone'));

// ISO 8601 date pattern: YYYY-MM-DD
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a single CSV/API record.
 * Collects ALL errors — does not short-circuit.
 * @param {object} record
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateRecord(record) {
  const errors = [];

  // --- full_name ---
  const rawName = record == null ? undefined : record.full_name;
  if (rawName === undefined || rawName === null || rawName === '') {
    errors.push('full_name is required');
  } else if (typeof rawName !== 'string') {
    errors.push('full_name must be a non-empty string');
  } else if (rawName.trim() === '') {
    errors.push('full_name must be a non-empty string');
  }

  // --- email ---
  const rawEmail = record == null ? undefined : record.email;
  if (rawEmail === undefined || rawEmail === null || rawEmail === '') {
    errors.push('email is required');
  } else if (typeof rawEmail !== 'string' || !validatorLib.isEmail(String(rawEmail).trim())) {
    errors.push(`Invalid email format: '${rawEmail}'`);
  }

  // --- date_of_birth ---
  const rawDob = record == null ? undefined : record.date_of_birth;
  if (rawDob === undefined || rawDob === null || rawDob === '') {
    errors.push('date_of_birth is required');
  } else {
    const dobStr = typeof rawDob === 'string' ? rawDob.trim() : String(rawDob);
    if (!DATE_PATTERN.test(dobStr)) {
      errors.push(
        `date_of_birth must be a valid date in YYYY-MM-DD format, received: '${rawDob}'`
      );
    } else {
      const parsed = new Date(dobStr);
      if (isNaN(parsed.getTime())) {
        errors.push(
          `date_of_birth must be a valid date in YYYY-MM-DD format, received: '${rawDob}'`
        );
      } else {
        const year = parsed.getUTCFullYear();
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        if (year < 1900 || parsed >= today) {
          errors.push(
            `date_of_birth must be a valid date in the past, received: '${rawDob}'`
          );
        }
      }
    }
  }

  // --- timezone ---
  const rawTz = record == null ? undefined : record.timezone;
  if (rawTz === undefined || rawTz === null || rawTz === '') {
    errors.push('timezone is required');
  } else if (!VALID_TIMEZONES.has(typeof rawTz === 'string' ? rawTz.trim() : String(rawTz))) {
    errors.push(`Invalid timezone: '${rawTz}'`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates only the fields present in the record (for PATCH endpoints).
 * Applies the same rules per field, but skips fields not present in the object.
 * @param {object} record
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePartialRecord(record) {
  const errors = [];

  if (record == null || typeof record !== 'object') {
    return { valid: false, errors: ['record must be an object'] };
  }

  // --- full_name (only if present) ---
  if (Object.prototype.hasOwnProperty.call(record, 'full_name')) {
    const rawName = record.full_name;
    if (rawName === undefined || rawName === null || rawName === '') {
      errors.push('full_name is required');
    } else if (typeof rawName !== 'string') {
      errors.push('full_name must be a non-empty string');
    } else if (rawName.trim() === '') {
      errors.push('full_name must be a non-empty string');
    }
  }

  // --- email (only if present) ---
  if (Object.prototype.hasOwnProperty.call(record, 'email')) {
    const rawEmail = record.email;
    if (rawEmail === undefined || rawEmail === null || rawEmail === '') {
      errors.push('email is required');
    } else if (typeof rawEmail !== 'string' || !validatorLib.isEmail(String(rawEmail).trim())) {
      errors.push(`Invalid email format: '${rawEmail}'`);
    }
  }

  // --- date_of_birth (only if present) ---
  if (Object.prototype.hasOwnProperty.call(record, 'date_of_birth')) {
    const rawDob = record.date_of_birth;
    if (rawDob === undefined || rawDob === null || rawDob === '') {
      errors.push('date_of_birth is required');
    } else {
      const dobStr = typeof rawDob === 'string' ? rawDob.trim() : String(rawDob);
      if (!DATE_PATTERN.test(dobStr)) {
        errors.push(
          `date_of_birth must be a valid date in YYYY-MM-DD format, received: '${rawDob}'`
        );
      } else {
        const parsed = new Date(dobStr);
        if (isNaN(parsed.getTime())) {
          errors.push(
            `date_of_birth must be a valid date in YYYY-MM-DD format, received: '${rawDob}'`
          );
        } else {
          const year = parsed.getUTCFullYear();
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);

          if (year < 1900 || parsed >= today) {
            errors.push(
              `date_of_birth must be a valid date in the past, received: '${rawDob}'`
            );
          }
        }
      }
    }
  }

  // --- timezone (only if present) ---
  if (Object.prototype.hasOwnProperty.call(record, 'timezone')) {
    const rawTz = record.timezone;
    if (rawTz === undefined || rawTz === null || rawTz === '') {
      errors.push('timezone is required');
    } else if (!VALID_TIMEZONES.has(typeof rawTz === 'string' ? rawTz.trim() : String(rawTz))) {
      errors.push(`Invalid timezone: '${rawTz}'`);
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateRecord, validatePartialRecord };
