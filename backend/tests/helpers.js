const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Province = require('../models/Province');
const TrainingActivity = require('../models/TrainingActivity');

let _counter = 0;
const uid = () => `${Date.now()}_${++_counter}`;

const createProvince = async (overrides = {}) =>
  Province.create({
    name: `Province_${uid()}`,
    code: `P${uid().slice(-4)}`,
    region: 'MIMAROPA',
    ...overrides,
  });

/**
 * Creates a user in the DB and returns { user, token }.
 * Password is always 'Password123!' before hashing.
 */
const createUser = async (role = 'province_focal', overrides = {}) => {
  const id = uid();
  const user = await User.create({
    username: `user_${id}`,
    email: `user_${id}@test.com`,
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User',
    role,
    isActive: true,
    ...overrides,
  });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: user.username, password: 'Password123!' });

  return { user, token: res.body.token };
};

const createTraining = async (userId, provinceId, overrides = {}) =>
  TrainingActivity.create({
    year: 2026,
    quarter: 'Q1',
    trainingCourse: `Training_${uid()}`,
    province: provinceId,
    createdBy: userId,
    updatedBy: userId,
    status: 'draft',
    ...overrides,
  });

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { createProvince, createUser, createTraining, authHeader };
