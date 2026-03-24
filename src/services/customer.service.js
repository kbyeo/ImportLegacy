const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const { validateRecord, validatePartialRecord } = require('../validators/record.validator');
const { paginate } = require('../utils/pagination');
const ApiError = require('../utils/ApiError');

function assertValidId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ID: '${id}'`, 'INVALID_ID');
  }
}

/**
 * List customers with optional filters and pagination.
 * @param {{ page, limit, email, fullName }} options
 * @returns {{ customers: object[], pagination: object }}
 */
async function listCustomers({ page, limit, email, fullName } = {}) {
  const filter = {};

  if (email) {
    filter.email = email.trim().toLowerCase();
  }

  if (fullName) {
    filter.fullName = { $regex: fullName.trim(), $options: 'i' };
  }

  const totalRecords = await Customer.countDocuments(filter);
  const { page: p, limit: l, skip, ...paginationMeta } = paginate(page, limit, totalRecords);

  const customers = await Customer.find(filter)
    .skip(skip)
    .limit(l)
    .sort({ createdAt: -1 })
    .lean();

  return {
    customers,
    pagination: { page: p, limit: l, skip, ...paginationMeta },
  };
}

/**
 * Get a single customer by ID.
 * @param {string} id
 * @returns {object}
 */
async function getCustomerById(id) {
  assertValidId(id);

  const customer = await Customer.findById(id).lean();
  if (!customer) {
    throw new ApiError(404, `Customer not found: '${id}'`, 'NOT_FOUND');
  }

  return customer;
}

/**
 * Update a customer (full PUT or partial PATCH).
 * @param {string} id
 * @param {object} data; Request body fields (snake_case from API layer)
 * @param {boolean} isPatch; true for PATCH (partial), false for PUT (full replacement)
 * @returns {object} Updated customer document
 */
async function updateCustomer(id, data, isPatch) {
  assertValidId(id);

  // Validate fields
  const { valid, errors } = isPatch
    ? validatePartialRecord(data)
    : validateRecord(data);

  if (!valid) {
    throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors);
  }

  // Check email uniqueness (if email is being updated)
  if (data.email) {
    const emailNorm = data.email.trim().toLowerCase();
    const conflict = await Customer.findOne({
      email: emailNorm,
      _id: { $ne: new mongoose.Types.ObjectId(id) },
    }).lean();

    if (conflict) {
      throw new ApiError(409, `Email already in use: '${emailNorm}'`, 'DUPLICATE_EMAIL');
    }
  }

  // Build the update document (map snake_case to camelCase model fields)
  const updateFields = {};

  if (data.full_name !== undefined) {
    updateFields.fullName = data.full_name.trim();
  }
  if (data.email !== undefined) {
    updateFields.email = data.email.trim().toLowerCase();
  }
  if (data.date_of_birth !== undefined) {
    updateFields.dateOfBirth = new Date(data.date_of_birth);
  }
  if (data.timezone !== undefined) {
    updateFields.timezone = data.timezone.trim();
  }

  const updated = await Customer.findByIdAndUpdate(
    id,
    isPatch ? { $set: updateFields } : updateFields,
    { new: true, runValidators: true, lean: true }
  );

  if (!updated) {
    throw new ApiError(404, `Customer not found: '${id}'`, 'NOT_FOUND');
  }

  return updated;
}

/**
 * Delete a customer by ID.
 * @param {string} id
 */
async function deleteCustomer(id) {
  assertValidId(id);

  const deleted = await Customer.findByIdAndDelete(id).lean();
  if (!deleted) {
    throw new ApiError(404, `Customer not found: '${id}'`, 'NOT_FOUND');
  }
}

module.exports = { listCustomers, getCustomerById, updateCustomer, deleteCustomer };
