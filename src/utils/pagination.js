/**
 * Calculates pagination metadata.
 * @param {number} page - Requested page number (1-indexed)
 * @param {number} limit - Records per page (max 100)
 * @param {number} totalRecords - Total number of records
 * @returns {{ page: number, limit: number, totalRecords: number, totalPages: number, skip: number }}
 */
function paginate(page, limit, totalRecords) {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);

  const clampedPage = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  let clampedLimit = isNaN(parsedLimit) || parsedLimit < 1 ? 10 : parsedLimit;
  if (clampedLimit > 100) clampedLimit = 100;

  const total = typeof totalRecords === 'number' && totalRecords >= 0 ? totalRecords : 0;
  const totalPages = clampedLimit > 0 ? Math.ceil(total / clampedLimit) : 0;
  const skip = (clampedPage - 1) * clampedLimit;

  return {
    page: clampedPage,
    limit: clampedLimit,
    totalRecords: total,
    totalPages,
    skip,
  };
}

module.exports = { paginate };
