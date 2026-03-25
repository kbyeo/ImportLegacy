const { paginate } = require('../../src/utils/pagination');

describe('paginate()', () => {
  it('returns correct metadata for a basic case', () => {
    const result = paginate(1, 10, 100);
    expect(result).toEqual({
      page: 1,
      limit: 10,
      totalRecords: 100,
      totalPages: 10,
      skip: 0,
    });
  });

  it('calculates skip and totalPages correctly for page 3', () => {
    const result = paginate(3, 20, 100);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(40);
    expect(result.totalPages).toBe(5);
    expect(result.totalRecords).toBe(100);
  });

  it('clamps page 0 to 1', () => {
    const result = paginate(0, 10, 50);
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('clamps negative page to 1', () => {
    const result = paginate(-1, 10, 50);
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('clamps limit 0 to default minimum of 1', () => {
    const result = paginate(1, 0, 50);
    expect(result.limit).toBeGreaterThanOrEqual(1);
  });

  it('clamps limit above 100 to 100', () => {
    const result = paginate(1, 200, 50);
    expect(result.limit).toBe(100);
  });

  it('returns totalPages 0 when totalRecords is 0', () => {
    const result = paginate(1, 10, 0);
    expect(result.totalPages).toBe(0);
    expect(result.totalRecords).toBe(0);
    expect(result.skip).toBe(0);
  });

  it('handles non-numeric strings by applying defaults', () => {
    const result = paginate('abc', 'xyz', 50);
    expect(result.page).toBe(1);
    expect(result.limit).toBeGreaterThanOrEqual(1);
  });

  it('handles undefined inputs gracefully', () => {
    const result = paginate(undefined, undefined, 50);
    expect(result.page).toBe(1);
    expect(result.totalRecords).toBe(50);
  });

  it('calculates correct totalPages with partial last page', () => {
    const result = paginate(1, 10, 25);
    expect(result.totalPages).toBe(3);
  });
});
