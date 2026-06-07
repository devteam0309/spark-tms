const request = require('supertest');
const app = require('../app');
const TargetSector = require('../models/TargetSector');
const { connect, disconnect, clearDb } = require('./dbSetup');
const { createUser, createProvince, createTraining, authHeader } = require('./helpers');

beforeAll(connect);
afterAll(disconnect);
afterEach(clearDb);

describe('GET /api/target-sectors', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/target-sectors');
    expect(res.status).toBe(401);
  });

  it('returns sector list for any authenticated user', async () => {
    const { token } = await createUser('province_focal');
    await TargetSector.create({ name: 'Youth' });
    const res = await request(app)
      .get('/api/target-sectors')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.map(s => s.name)).toContain('Youth');
  });
});

describe('POST /api/target-sectors', () => {
  it('returns 403 for province_focal', async () => {
    const { token } = await createUser('province_focal');
    const res = await request(app)
      .post('/api/target-sectors')
      .set(authHeader(token))
      .send({ name: 'PWD' });
    expect(res.status).toBe(403);
  });

  it('creates a sector as spark_focal', async () => {
    const { token } = await createUser('spark_focal');
    const res = await request(app)
      .post('/api/target-sectors')
      .set(authHeader(token))
      .send({ name: 'PWD' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('PWD');
    expect(res.body.isActive).toBe(true);
  });

  it('rejects an empty name', async () => {
    const { token } = await createUser('spark_focal');
    const res = await request(app)
      .post('/api/target-sectors')
      .set(authHeader(token))
      .send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name is required/i);
  });

  it('rejects a duplicate name', async () => {
    const { token } = await createUser('spark_focal');
    await TargetSector.create({ name: 'MSME' });
    const res = await request(app)
      .post('/api/target-sectors')
      .set(authHeader(token))
      .send({ name: 'MSME' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

describe('PUT /api/target-sectors/:id', () => {
  it('returns 403 for province_focal', async () => {
    const { token } = await createUser('province_focal');
    const sector = await TargetSector.create({ name: 'Women' });
    const res = await request(app)
      .put(`/api/target-sectors/${sector._id}`)
      .set(authHeader(token))
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });

  it('renames a sector', async () => {
    const { token } = await createUser('spark_focal');
    const sector = await TargetSector.create({ name: 'New Hires' });
    const res = await request(app)
      .put(`/api/target-sectors/${sector._id}`)
      .set(authHeader(token))
      .send({ name: 'Fresh Graduates' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Fresh Graduates');
  });

  it('rejects a name conflict with another sector', async () => {
    const { token } = await createUser('spark_focal');
    const s1 = await TargetSector.create({ name: 'Sector One' });
    await TargetSector.create({ name: 'Sector Two' });
    const res = await request(app)
      .put(`/api/target-sectors/${s1._id}`)
      .set(authHeader(token))
      .send({ name: 'Sector Two' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('rejects an empty-string name (required field)', async () => {
    const { token } = await createUser('spark_focal');
    const sector = await TargetSector.create({ name: 'Sector Three' });
    const res = await request(app)
      .put(`/api/target-sectors/${sector._id}`)
      .set(authHeader(token))
      .send({ name: '' });
    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/required/i);
  });

  it('toggles isActive without changing the name', async () => {
    const { token } = await createUser('spark_focal');
    const sector = await TargetSector.create({ name: 'Sector Four' });
    const res = await request(app)
      .put(`/api/target-sectors/${sector._id}`)
      .set(authHeader(token))
      .send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Sector Four');
    expect(res.body.isActive).toBe(false);
  });
});

describe('DELETE /api/target-sectors/:id', () => {
  it('returns 403 for province_focal', async () => {
    const { token } = await createUser('province_focal');
    const sector = await TargetSector.create({ name: 'Sector Five' });
    const res = await request(app)
      .delete(`/api/target-sectors/${sector._id}`)
      .set(authHeader(token));
    expect(res.status).toBe(403);
  });

  it('returns 400 when the sector is referenced by training records', async () => {
    const { user, token } = await createUser('spark_focal');
    const province = await createProvince();
    const sector = await TargetSector.create({ name: 'Sector Six' });
    await createTraining(user._id, province._id, { targetSector: sector.name });

    const res = await request(app)
      .delete(`/api/target-sectors/${sector._id}`)
      .set(authHeader(token));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/training record/i);
  });

  it('deletes an unused sector', async () => {
    const { token } = await createUser('spark_focal');
    const sector = await TargetSector.create({ name: 'Sector Seven' });
    const res = await request(app)
      .delete(`/api/target-sectors/${sector._id}`)
      .set(authHeader(token));
    expect(res.status).toBe(200);
    const deleted = await TargetSector.findById(sector._id);
    expect(deleted).toBeNull();
  });
});
