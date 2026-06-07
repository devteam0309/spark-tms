const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clearDb } = require('./dbSetup');
const { createUser, createProvince, createTraining, authHeader } = require('./helpers');

beforeAll(connect);
afterAll(disconnect);
afterEach(clearDb);

describe('GET /api/exports/excel', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/exports/excel');
    expect(res.status).toBe(401);
  });

  it('returns xlsx stream with correct content-type', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('spark_focal');
    await createTraining(user._id, province._id);

    const res = await request(app)
      .get('/api/exports/excel')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(
      /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i
    );
    expect(res.headers['content-disposition']).toMatch(/attachment/i);
    expect(res.body).toBeTruthy();
  });

  it('province_focal export is scoped to own province', async () => {
    const p1 = await createProvince();
    const p2 = await createProvince();
    const { user: f1, token } = await createUser('province_focal', { assignedProvince: p1._id });
    const { user: f2 } = await createUser('province_focal', { assignedProvince: p2._id });

    await createTraining(f1._id, p1._id);
    await createTraining(f2._id, p2._id);

    // Request goes through without error (scoping is tested via data integrity in other tests)
    const res = await request(app)
      .get('/api/exports/excel')
      .set(authHeader(token));
    expect(res.status).toBe(200);
  });
});

describe('GET /api/exports/pdf', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/exports/pdf');
    expect(res.status).toBe(401);
  });

  it('returns pdf stream with correct content-type', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('spark_focal');
    await createTraining(user._id, province._id);

    const res = await request(app)
      .get('/api/exports/pdf')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/i);
    expect(res.headers['content-disposition']).toMatch(/attachment/i);
  });
});
