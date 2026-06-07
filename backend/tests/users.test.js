const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const { connect, disconnect, clearDb } = require('./dbSetup');
const { createUser, createProvince, authHeader } = require('./helpers');

beforeAll(connect);
afterAll(disconnect);
afterEach(clearDb);

describe('GET /api/users', () => {
  it('returns 403 for province_focal', async () => {
    const { token } = await createUser('province_focal');
    const res = await request(app)
      .get('/api/users')
      .set(authHeader(token));
    expect(res.status).toBe(403);
  });

  it('returns user list for spark_focal', async () => {
    const { token } = await createUser('spark_focal');
    await createUser('province_focal');
    const res = await request(app)
      .get('/api/users')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    res.body.forEach((u) => expect(u.password).toBeUndefined());
  });
});

describe('POST /api/users', () => {
  it('returns 403 for province_focal', async () => {
    const { token } = await createUser('province_focal');
    const res = await request(app)
      .post('/api/users')
      .set(authHeader(token))
      .send({ username: 'newuser', email: 'new@test.com', password: 'Pass1234!', firstName: 'New', lastName: 'User' });
    expect(res.status).toBe(403);
  });

  it('creates user and sets mustChangePassword=true', async () => {
    const { token } = await createUser('spark_focal');
    const res = await request(app)
      .post('/api/users')
      .set(authHeader(token))
      .send({
        username: 'newuser99',
        email: 'new99@test.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        role: 'province_focal',
      });
    expect(res.status).toBe(201);
    expect(res.body.mustChangePassword).toBe(true);
    expect(res.body.password).toBeUndefined();
  });

  it('rejects duplicate username', async () => {
    const { token } = await createUser('spark_focal');
    const { user } = await createUser('province_focal');
    const res = await request(app)
      .post('/api/users')
      .set(authHeader(token))
      .send({
        username: user.username,
        email: 'unique99@test.com',
        password: 'Password123!',
        firstName: 'A',
        lastName: 'B',
      });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate email', async () => {
    const { token } = await createUser('spark_focal');
    const { user } = await createUser('province_focal');
    const res = await request(app)
      .post('/api/users')
      .set(authHeader(token))
      .send({
        username: 'brandnewuser',
        email: user.email,
        password: 'Password123!',
        firstName: 'A',
        lastName: 'B',
      });
    expect(res.status).toBe(400);
  });

  it('rejects non-existent province', async () => {
    const { token } = await createUser('spark_focal');
    const fakeId = '000000000000000000000001';
    const res = await request(app)
      .post('/api/users')
      .set(authHeader(token))
      .send({
        username: 'newuserxyz',
        email: 'newxyz@test.com',
        password: 'Password123!',
        firstName: 'A',
        lastName: 'B',
        assignedProvince: fakeId,
      });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/users/:id', () => {
  it('updates user successfully as spark_focal', async () => {
    const { token } = await createUser('spark_focal');
    const { user } = await createUser('province_focal');
    const res = await request(app)
      .put(`/api/users/${user._id}`)
      .set(authHeader(token))
      .send({ firstName: 'Changed' });
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Changed');
  });

  it('rejects duplicate email on update', async () => {
    const { token } = await createUser('spark_focal');
    const { user: u1 } = await createUser('province_focal');
    const { user: u2 } = await createUser('province_focal');
    const res = await request(app)
      .put(`/api/users/${u1._id}`)
      .set(authHeader(token))
      .send({ email: u2.email });
    expect(res.status).toBe(400);
  });

  it('returns 403 for province_focal editing another user', async () => {
    const { token } = await createUser('province_focal');
    const { user: other } = await createUser('province_focal');
    const res = await request(app)
      .put(`/api/users/${other._id}`)
      .set(authHeader(token))
      .send({ firstName: 'Hacked' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/users/:id', () => {
  it('prevents self-deletion', async () => {
    const { user, token } = await createUser('spark_focal');
    const res = await request(app)
      .delete(`/api/users/${user._id}`)
      .set(authHeader(token));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot delete your own/i);
  });

  it('deletes another user successfully', async () => {
    const { token } = await createUser('spark_focal');
    const { user: target } = await createUser('province_focal');
    const res = await request(app)
      .delete(`/api/users/${target._id}`)
      .set(authHeader(token));
    expect(res.status).toBe(200);
    const deleted = await User.findById(target._id);
    expect(deleted).toBeNull();
  });

  it('returns 403 for province_focal', async () => {
    const { token } = await createUser('province_focal');
    const { user: other } = await createUser('province_focal');
    const res = await request(app)
      .delete(`/api/users/${other._id}`)
      .set(authHeader(token));
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/users/:id/reset-password', () => {
  it('resets password and sets mustChangePassword=true', async () => {
    const { token } = await createUser('spark_focal');
    const { user: target } = await createUser('province_focal');
    const prevVersion = target.tokenVersion;
    const res = await request(app)
      .put(`/api/users/${target._id}/reset-password`)
      .set(authHeader(token))
      .send({ newPassword: 'Reset1234!' });
    expect(res.status).toBe(200);
    const updated = await User.findById(target._id);
    expect(updated.mustChangePassword).toBe(true);
    expect(updated.tokenVersion).toBeGreaterThan(prevVersion);
  });
});

describe('PUT /api/users/:id/assign-province', () => {
  it('assigns a valid province', async () => {
    const { token } = await createUser('spark_focal');
    const { user: target } = await createUser('province_focal');
    const province = await createProvince();
    const res = await request(app)
      .put(`/api/users/${target._id}/assign-province`)
      .set(authHeader(token))
      .send({ provinceId: province._id });
    expect(res.status).toBe(200);
    const updated = await User.findById(target._id);
    expect(updated.assignedProvince.toString()).toBe(province._id.toString());
  });

  it('returns 404 for non-existent province', async () => {
    const { token } = await createUser('spark_focal');
    const { user: target } = await createUser('province_focal');
    const res = await request(app)
      .put(`/api/users/${target._id}/assign-province`)
      .set(authHeader(token))
      .send({ provinceId: '000000000000000000000001' });
    expect(res.status).toBe(404);
  });

  it('unassigns province when null is passed', async () => {
    const { token } = await createUser('spark_focal');
    const province = await createProvince();
    const { user: target } = await createUser('province_focal', { assignedProvince: province._id });
    const res = await request(app)
      .put(`/api/users/${target._id}/assign-province`)
      .set(authHeader(token))
      .send({ provinceId: null });
    expect(res.status).toBe(200);
    const updated = await User.findById(target._id);
    expect(updated.assignedProvince).toBeNull();
  });
});
