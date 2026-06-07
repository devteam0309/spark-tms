const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clearDb } = require('./dbSetup');
const { createUser, createProvince, createTraining, authHeader } = require('./helpers');

beforeAll(connect);
afterAll(disconnect);
afterEach(clearDb);

describe('GET /api/dashboard/spark', () => {
  it('returns 403 for province_focal', async () => {
    const { token } = await createUser('province_focal');
    const res = await request(app)
      .get('/api/dashboard/spark')
      .set(authHeader(token));
    expect(res.status).toBe(403);
  });

  it('returns dashboard data for spark_focal', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('spark_focal');
    await createTraining(user._id, province._id, { status: 'submitted' });
    await createTraining(user._id, province._id, { status: 'approved' });

    const res = await request(app)
      .get('/api/dashboard/spark')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalTrainings');
    expect(res.body.totalTrainings).toBe(2);
    expect(res.body).toHaveProperty('byStatus');
  });

  it('filters by year query param', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('spark_focal');
    await createTraining(user._id, province._id, { year: 2025 });
    await createTraining(user._id, province._id, { year: 2026 });

    const res = await request(app)
      .get('/api/dashboard/spark?year=2025')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.totalTrainings).toBe(1);
  });
});

describe('GET /api/dashboard/province', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/dashboard/province');
    expect(res.status).toBe(401);
  });

  it('returns province-scoped data for province_focal', async () => {
    const p1 = await createProvince();
    const p2 = await createProvince();
    const { user: f1, token } = await createUser('province_focal', { assignedProvince: p1._id });
    const { user: f2 } = await createUser('province_focal', { assignedProvince: p2._id });

    await createTraining(f1._id, p1._id);
    await createTraining(f2._id, p2._id);

    const res = await request(app)
      .get('/api/dashboard/province')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body.total).toBe(1);
  });
});
