const request = require('supertest');
const crypto = require('crypto');
const app = require('../app');
const User = require('../models/User');
const { connect, disconnect, clearDb } = require('./dbSetup');
const { createUser } = require('./helpers');

beforeAll(connect);
afterAll(disconnect);
afterEach(clearDb);

describe('POST /api/auth/login', () => {
  it('returns 400 when credentials are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for unknown username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'Password123!' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it('returns 401 for wrong password', async () => {
    await createUser('province_focal', { username: 'tester' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'tester', password: 'WrongPass1!' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for inactive user', async () => {
    const { user } = await createUser('province_focal');
    await User.findByIdAndUpdate(user._id, { isActive: false });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: 'Password123!' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with token on valid credentials', async () => {
    const { user } = await createUser('province_focal');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.password).toBeUndefined();
  });

  it('accepts email as username field', async () => {
    const { user } = await createUser('province_focal');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: user.email, password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('returns current user with valid token', async () => {
    const { user, token } = await createUser('spark_focal');
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(user.username);
    expect(res.body.password).toBeUndefined();
  });

  it('returns 401 when tokenVersion is stale', async () => {
    const { user, token } = await createUser('province_focal');
    // Invalidate all sessions by bumping tokenVersion
    await User.findByIdAndUpdate(user._id, { tokenVersion: 99 });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/auth/profile', () => {
  it('updates profile successfully', async () => {
    const { token } = await createUser('province_focal');
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Updated', lastName: 'Name' });
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Updated');
  });

  it('rejects duplicate email', async () => {
    const { token } = await createUser('province_focal');
    const { user: other } = await createUser('province_focal');
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: other.email });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already in use/i);
  });
});

describe('PUT /api/auth/change-password', () => {
  it('returns 400 for missing fields', async () => {
    const { token } = await createUser('province_focal');
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password123!' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for wrong current password', async () => {
    const { token } = await createUser('province_focal');
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongOld!', newPassword: 'NewPass123!' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/incorrect/i);
  });

  it('returns 400 when new password is too short', async () => {
    const { token } = await createUser('province_focal');
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password123!', newPassword: 'short' });
    expect(res.status).toBe(400);
  });

  it('changes password and clears mustChangePassword', async () => {
    const { user, token } = await createUser('province_focal');
    await User.findByIdAndUpdate(user._id, { mustChangePassword: true });
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password123!', newPassword: 'NewStrong99!' });
    expect(res.status).toBe(200);
    const updated = await User.findById(user._id);
    expect(updated.mustChangePassword).toBe(false);
  });
});

describe('PUT /api/auth/force-change-password', () => {
  it('returns 400 when mustChangePassword is false', async () => {
    const { token } = await createUser('province_focal');
    const res = await request(app)
      .put('/api/auth/force-change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ newPassword: 'NewStrong99!' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not required/i);
  });

  it('returns 400 for short password', async () => {
    const { user, token } = await createUser('province_focal');
    await User.findByIdAndUpdate(user._id, { mustChangePassword: true });
    const res = await request(app)
      .put('/api/auth/force-change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ newPassword: 'short' });
    expect(res.status).toBe(400);
  });

  it('changes password and returns new token', async () => {
    const { user, token } = await createUser('province_focal');
    await User.findByIdAndUpdate(user._id, { mustChangePassword: true });
    const res = await request(app)
      .put('/api/auth/force-change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ newPassword: 'NewStrong99!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.token).not.toBe(token);
    const updated = await User.findById(user._id);
    expect(updated.mustChangePassword).toBe(false);
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({});
    expect(res.status).toBe(400);
  });

  it('returns generic success for unknown email (no enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@nowhere.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if that email/i);
  });

  it('returns generic success for known email and sets reset token in DB', async () => {
    const { user } = await createUser('province_focal');
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if that email/i);
    const updated = await User.findById(user._id);
    expect(updated.resetPasswordToken).toBeTruthy();
    expect(updated.resetPasswordExpires).toBeTruthy();
  });
});

describe('POST /api/auth/reset-password/:token', () => {
  it('returns 400 for short new password', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password/sometoken')
      .send({ newPassword: 'short' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid or expired token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password/invalidtoken123')
      .send({ newPassword: 'NewStrong99!' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/i);
  });

  it('resets password with valid token and clears token fields', async () => {
    const { user } = await createUser('province_focal');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: Date.now() + 60 * 60 * 1000,
    });

    const res = await request(app)
      .post(`/api/auth/reset-password/${rawToken}`)
      .send({ newPassword: 'NewStrong99!' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/successful/i);

    const updated = await User.findById(user._id);
    expect(updated.resetPasswordToken).toBeUndefined();
    expect(updated.mustChangePassword).toBe(false);
  });

  it('returns 400 for expired token', async () => {
    const { user } = await createUser('province_focal');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: Date.now() - 1000, // already expired
    });

    const res = await request(app)
      .post(`/api/auth/reset-password/${rawToken}`)
      .send({ newPassword: 'NewStrong99!' });

    expect(res.status).toBe(400);
  });
});
