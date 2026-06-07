const buildFilter = require('./buildFilter');

const makeUser = (role, assignedProvince = null) => ({ role, assignedProvince });
const pid = '6876543210abcdef12345678';

describe('buildFilter — role scoping', () => {
  it('province_focal filter uses assignedProvince._id (populated)', () => {
    const user = makeUser('province_focal', { _id: pid });
    const filter = buildFilter(user, {});
    expect(filter.province.toString()).toBe(pid);
  });

  it('province_focal filter uses assignedProvince directly (unpopulated)', () => {
    const user = makeUser('province_focal', pid);
    const filter = buildFilter(user, {});
    expect(filter.province).toBe(pid);
  });

  it('spark_focal with province query applies province filter', () => {
    const user = makeUser('spark_focal');
    const filter = buildFilter(user, { province: pid });
    expect(filter.province).toBe(pid);
  });

  it('spark_focal without province query has no province filter', () => {
    const user = makeUser('spark_focal');
    const filter = buildFilter(user, {});
    expect(filter.province).toBeUndefined();
  });
});

describe('buildFilter — field filters', () => {
  it('applies status filter', () => {
    const user = makeUser('spark_focal');
    const filter = buildFilter(user, { status: 'approved' });
    expect(filter.status).toBe('approved');
  });

  it('applies quarter filter', () => {
    const user = makeUser('spark_focal');
    const filter = buildFilter(user, { quarter: 'Q2' });
    expect(filter.quarter).toBe('Q2');
  });

  it('applies year filter as integer', () => {
    const user = makeUser('spark_focal');
    const filter = buildFilter(user, { year: '2026' });
    expect(filter.year).toBe(2026);
    expect(typeof filter.year).toBe('number');
  });
});

describe('buildFilter — search / ReDoS protection', () => {
  it('builds $or search filter for trainingCourse, trainer, venue', () => {
    const user = makeUser('spark_focal');
    const filter = buildFilter(user, { search: 'web dev' });
    expect(filter.$or).toHaveLength(3);
    expect(filter.$or[0].trainingCourse).toBeDefined();
  });

  it('escapes regex special characters in search', () => {
    const user = makeUser('spark_focal');
    const filter = buildFilter(user, { search: '.*+?^${}()|' });
    const regexStr = filter.$or[0].trainingCourse.$regex;
    // Every special char should be preceded by a backslash (escaped)
    expect(regexStr).not.toMatch(/(?<!\\)[.+?^${}()|]/);
    expect(regexStr).toMatch(/^\\\.\\\*/);
  });

  it('caps search input at 200 characters', () => {
    const user = makeUser('spark_focal');
    const longSearch = 'a'.repeat(300);
    const filter = buildFilter(user, { search: longSearch });
    expect(filter.$or[0].trainingCourse.$regex.length).toBeLessThanOrEqual(200);
  });

  it('no search filter when query.search is absent', () => {
    const user = makeUser('spark_focal');
    const filter = buildFilter(user, {});
    expect(filter.$or).toBeUndefined();
  });
});

describe('buildFilter — empty query', () => {
  it('returns empty filter for spark_focal with no query params', () => {
    const user = makeUser('spark_focal');
    const filter = buildFilter(user, {});
    expect(Object.keys(filter).length).toBe(0);
  });
});
