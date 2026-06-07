const request = require('supertest');
const app = require('../app');
const Province = require('../models/Province');
const User = require('../models/User');
const { connect, disconnect, clearDb } = require('./dbSetup');
const { createUser, createProvince, createTraining, authHeader } = require('./helpers');

beforeAll(connect);
afterAll(disconnect);
afterEach(clearDb);

describe('GET /api/provinces', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/provinces');
    expect(res.status).toBe(401);
  });

  it('returns province list for any authenticated user', async () => {
    const { token } = await createUser('province_focal');
    await createProvince({ name: 'Oriental Mindoro', code: 'ORMIN' });
    const res = await request(app)
      .get('/api/provinces')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /api/provinces', () => {
  it('returns 403 for province_focal', async () => {
    const { token } = await createUser('province_focal');
    const res = await request(app)
      .post('/api/provinces')
      .set(authHeader(token))
      .send({ name: 'Test Province', code: 'TPROV' });
    expect(res.status).toBe(403);
  });

  it('creates province as spark_focal', async () => {
    const { token } = await createUser('spark_focal');
    const res = await request(app)
      .post('/api/provinces')
      .set(authHeader(token))
      .send({ name: 'Romblon', code: 'ROMBL' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Romblon');
    expect(res.body.code).toBe('ROMBL');
  });

  it('rejects duplicate province name', async () => {
    const { token } = await createUser('spark_focal');
    await createProvince({ name: 'Palawan', code: 'PLW01' });
    const res = await request(app)
      .post('/api/provinces')
      .set(authHeader(token))
      .send({ name: 'Palawan', code: 'PLW02' });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate province code', async () => {
    const { token } = await createUser('spark_focal');
    await createProvince({ name: 'Province A', code: 'DUPC1' });
    const res = await request(app)
      .post('/api/provinces')
      .set(authHeader(token))
      .send({ name: 'Province B', code: 'DUPC1' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/provinces/:id', () => {
  it('updates province name', async () => {
    const { token } = await createUser('spark_focal');
    const province = await createProvince({ name: 'Old Name', code: 'OLDN1' });
    const res = await request(app)
      .put(`/api/provinces/${province._id}`)
      .set(authHeader(token))
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });

  it('rejects name conflict with other province on update', async () => {
    const { token } = await createUser('spark_focal');
    const p1 = await createProvince({ name: 'Province One', code: 'PON1' });
    await createProvince({ name: 'Province Two', code: 'PON2' });
    const res = await request(app)
      .put(`/api/provinces/${p1._id}`)
      .set(authHeader(token))
      .send({ name: 'Province Two' });
    expect(res.status).toBe(400);
  });

  it('rejects code conflict with other province on update', async () => {
    const { token } = await createUser('spark_focal');
    const p1 = await createProvince({ name: 'Province Alpha', code: 'ALPH' });
    await createProvince({ name: 'Province Beta', code: 'BETA' });
    const res = await request(app)
      .put(`/api/provinces/${p1._id}`)
      .set(authHeader(token))
      .send({ code: 'BETA' });
    expect(res.status).toBe(400);
  });

  it('returns 403 for province_focal', async () => {
    const { token } = await createUser('province_focal');
    const province = await createProvince();
    const res = await request(app)
      .put(`/api/provinces/${province._id}`)
      .set(authHeader(token))
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/provinces/:id', () => {
  it('returns 403 for province_focal', async () => {
    const { token } = await createUser('province_focal');
    const province = await createProvince();
    const res = await request(app)
      .delete(`/api/provinces/${province._id}`)
      .set(authHeader(token));
    expect(res.status).toBe(403);
  });

  it('returns 400 when province has linked training records', async () => {
    const { user, token } = await createUser('spark_focal');
    const province = await createProvince();
    await createTraining(user._id, province._id);
    const res = await request(app)
      .delete(`/api/provinces/${province._id}`)
      .set(authHeader(token));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/training record/i);
  });

  it('deletes province and clears user assignments', async () => {
    const { user: admin, token } = await createUser('spark_focal');
    const province = await createProvince();
    const { user: focal } = await createUser('province_focal', { assignedProvince: province._id });
    const res = await request(app)
      .delete(`/api/provinces/${province._id}`)
      .set(authHeader(token));
    expect(res.status).toBe(200);
    const deleted = await Province.findById(province._id);
    expect(deleted).toBeNull();
    const updated = await User.findById(focal._id);
    expect(updated.assignedProvince).toBeNull();
  });
});
