const request = require('supertest');
const app = require('../app');
const TrainingActivity = require('../models/TrainingActivity');
const { connect, disconnect, clearDb } = require('./dbSetup');
const { createUser, createProvince, createTraining, authHeader } = require('./helpers');

beforeAll(connect);
afterAll(disconnect);
afterEach(clearDb);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const submittableBody = (provinceId) => ({
  year: 2026,
  quarter: 'Q1',
  trainingCourse: 'Web Development',
  province: provinceId.toString(),
  targetSector: 'Youth',
  venue: 'DICT Office',
  courseCoordinator: 'Coord A',
  trainer: 'Trainer B',
  startDate: '2026-02-01',
  endDate: '2026-02-05',
  mode: 'Face-to-Face',
});

// ─── POST /api/trainings ──────────────────────────────────────────────────────

describe('POST /api/trainings', () => {
  it('returns 400 when province_focal has no province', async () => {
    const { token } = await createUser('province_focal'); // no province
    const res = await request(app)
      .post('/api/trainings')
      .set(authHeader(token))
      .send({ year: 2026, quarter: 'Q1', trainingCourse: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/must be assigned to a province/i);
  });

  it('creates draft training for province_focal with province', async () => {
    const province = await createProvince();
    const { token } = await createUser('province_focal', { assignedProvince: province._id });
    const res = await request(app)
      .post('/api/trainings')
      .set(authHeader(token))
      .send({ year: 2026, quarter: 'Q1', trainingCourse: 'Basic IT' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');
    expect(res.body.province.toString()).toBe(province._id.toString());
  });

  it('creates training for spark_focal with explicit province', async () => {
    const province = await createProvince();
    const { token } = await createUser('spark_focal');
    const res = await request(app)
      .post('/api/trainings')
      .set(authHeader(token))
      .send({ year: 2026, quarter: 'Q2', trainingCourse: 'Data Science', province: province._id });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');
  });

  it('returns 400 for invalid URL in link field', async () => {
    const province = await createProvince();
    const { token } = await createUser('province_focal', { assignedProvince: province._id });
    const res = await request(app)
      .post('/api/trainings')
      .set(authHeader(token))
      .send({
        year: 2026,
        quarter: 'Q1',
        trainingCourse: 'Bad Link Test',
        trainerRequirementsLink: 'not-a-url',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid url/i);
  });

  it('accepts valid https URL in link field', async () => {
    const province = await createProvince();
    const { token } = await createUser('province_focal', { assignedProvince: province._id });
    const res = await request(app)
      .post('/api/trainings')
      .set(authHeader(token))
      .send({
        year: 2026,
        quarter: 'Q1',
        trainingCourse: 'Good Link Test',
        trainerRequirementsLink: 'https://drive.google.com/file/123',
      });
    expect(res.status).toBe(201);
  });
});

// ─── GET /api/trainings ───────────────────────────────────────────────────────

describe('GET /api/trainings', () => {
  it('province_focal only sees trainings from own province', async () => {
    const p1 = await createProvince();
    const p2 = await createProvince();
    const { user: focal1, token } = await createUser('province_focal', { assignedProvince: p1._id });
    const { user: focal2 } = await createUser('province_focal', { assignedProvince: p2._id });

    await createTraining(focal1._id, p1._id);
    await createTraining(focal2._id, p2._id);

    const res = await request(app)
      .get('/api/trainings')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.trainings.length).toBe(1);
    expect(res.body.trainings[0].province._id.toString()).toBe(p1._id.toString());
  });

  it('spark_focal sees all trainings', async () => {
    const p1 = await createProvince();
    const p2 = await createProvince();
    const { user: f1 } = await createUser('province_focal', { assignedProvince: p1._id });
    const { user: f2 } = await createUser('province_focal', { assignedProvince: p2._id });
    const { token } = await createUser('spark_focal');

    await createTraining(f1._id, p1._id);
    await createTraining(f2._id, p2._id);

    const res = await request(app)
      .get('/api/trainings')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.trainings.length).toBe(2);
  });

  it('filters by status', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('spark_focal');
    await createTraining(user._id, province._id, { status: 'draft' });
    await createTraining(user._id, province._id, { status: 'submitted' });

    const res = await request(app)
      .get('/api/trainings?status=submitted')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.trainings.length).toBe(1);
    expect(res.body.trainings[0].status).toBe('submitted');
  });

  it('search escapes regex special characters', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('spark_focal');
    await createTraining(user._id, province._id, { trainingCourse: 'Normal Course' });

    // A regex injection like '.*' should not throw, just return no results
    const res = await request(app)
      .get('/api/trainings?search=.*')
      .set(authHeader(token));
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/trainings/:id ───────────────────────────────────────────────────

describe('GET /api/trainings/:id', () => {
  it('returns training detail for owner province_focal', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id);
    const res = await request(app)
      .get(`/api/trainings/${training._id}`)
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.training._id.toString()).toBe(training._id.toString());
  });

  it('returns 403 for province_focal from different province', async () => {
    const p1 = await createProvince();
    const p2 = await createProvince();
    const { user: f1 } = await createUser('province_focal', { assignedProvince: p1._id });
    const { token: f2Token } = await createUser('province_focal', { assignedProvince: p2._id });
    const training = await createTraining(f1._id, p1._id);

    const res = await request(app)
      .get(`/api/trainings/${training._id}`)
      .set(authHeader(f2Token));
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent training', async () => {
    const { token } = await createUser('spark_focal');
    const res = await request(app)
      .get('/api/trainings/000000000000000000000001')
      .set(authHeader(token));
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/trainings/:id ───────────────────────────────────────────────────

describe('PUT /api/trainings/:id', () => {
  it('province_focal can update own draft training', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id);

    const res = await request(app)
      .put(`/api/trainings/${training._id}`)
      .set(authHeader(token))
      .send({ trainingCourse: 'Updated Course Name' });
    expect(res.status).toBe(200);
    expect(res.body.trainingCourse).toBe('Updated Course Name');
  });

  it('province_focal cannot update submitted training', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id, { status: 'submitted' });

    const res = await request(app)
      .put(`/api/trainings/${training._id}`)
      .set(authHeader(token))
      .send({ trainingCourse: 'Attempt' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid URL in document link fields', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id);

    const res = await request(app)
      .put(`/api/trainings/${training._id}`)
      .set(authHeader(token))
      .send({ certificateOfCompletionLink: 'javascript:alert(1)' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid url/i);
  });

  it('validates endDate >= startDate', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id);

    const res = await request(app)
      .put(`/api/trainings/${training._id}`)
      .set(authHeader(token))
      .send({ startDate: '2026-03-10', endDate: '2026-03-05' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/end date/i);
  });

  it('spark_focal can update any training', async () => {
    const province = await createProvince();
    const { user: focal } = await createUser('province_focal', { assignedProvince: province._id });
    const { token: sparkToken } = await createUser('spark_focal');
    const training = await createTraining(focal._id, province._id, { status: 'submitted' });

    const res = await request(app)
      .put(`/api/trainings/${training._id}`)
      .set(authHeader(sparkToken))
      .send({ trainingCourse: 'Spark Override' });
    expect(res.status).toBe(200);
  });

  it('accepts "TBD" for assessmentDate/graduationDate and "Hybrid" mode', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id);

    const res = await request(app)
      .put(`/api/trainings/${training._id}`)
      .set(authHeader(token))
      .send({ assessmentDate: 'TBD', graduationDate: 'TBD', mode: 'Hybrid' });
    expect(res.status).toBe(200);
    expect(res.body.assessmentDate).toBe('TBD');
    expect(res.body.graduationDate).toBe('TBD');
    expect(res.body.mode).toBe('Hybrid');
  });

  it('rejects an assessmentDate that is neither a valid date nor "TBD"', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id);

    const res = await request(app)
      .put(`/api/trainings/${training._id}`)
      .set(authHeader(token))
      .send({ assessmentDate: 'not-a-real-date' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid date or "TBD"/i);
  });

  it('rejects an invalid trainingStatus value', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id);

    const res = await request(app)
      .put(`/api/trainings/${training._id}`)
      .set(authHeader(token))
      .send({ trainingStatus: 'Cancelled' });
    expect(res.status).toBe(400);
  });

  it('accepts a valid trainingStatus transition to "Done"', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id);

    const res = await request(app)
      .put(`/api/trainings/${training._id}`)
      .set(authHeader(token))
      .send({ trainingStatus: 'Done' });
    expect(res.status).toBe(200);
    expect(res.body.trainingStatus).toBe('Done');
  });
});

// ─── DELETE /api/trainings/:id ────────────────────────────────────────────────

describe('DELETE /api/trainings/:id', () => {
  it('province_focal can delete own draft', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id);

    const res = await request(app)
      .delete(`/api/trainings/${training._id}`)
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(await TrainingActivity.findById(training._id)).toBeNull();
  });

  it('province_focal cannot delete submitted training', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id, { status: 'submitted' });

    const res = await request(app)
      .delete(`/api/trainings/${training._id}`)
      .set(authHeader(token));
    expect(res.status).toBe(400);
  });

  it('spark_focal cannot delete consolidated training', async () => {
    const province = await createProvince();
    const { user: focal } = await createUser('province_focal', { assignedProvince: province._id });
    const { token: sparkToken } = await createUser('spark_focal');
    const training = await createTraining(focal._id, province._id, { status: 'consolidated' });

    const res = await request(app)
      .delete(`/api/trainings/${training._id}`)
      .set(authHeader(sparkToken));
    expect(res.status).toBe(400);
  });

  it('province_focal cannot delete from other province', async () => {
    const p1 = await createProvince();
    const p2 = await createProvince();
    const { user: f1 } = await createUser('province_focal', { assignedProvince: p1._id });
    const { token: f2Token } = await createUser('province_focal', { assignedProvince: p2._id });
    const training = await createTraining(f1._id, p1._id);

    const res = await request(app)
      .delete(`/api/trainings/${training._id}`)
      .set(authHeader(f2Token));
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/trainings/:id/status ─────────────────────────────────────────

describe('PATCH /api/trainings/:id/status', () => {
  it('province_focal can submit a complete draft', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id, submittableBody(province._id));

    const res = await request(app)
      .patch(`/api/trainings/${training._id}/status`)
      .set(authHeader(token))
      .send({ status: 'submitted' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('submitted');
  });

  it('province_focal cannot submit with missing required fields', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id); // minimal, missing many fields

    const res = await request(app)
      .patch(`/api/trainings/${training._id}/status`)
      .set(authHeader(token))
      .send({ status: 'submitted' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/missing required fields/i);
  });

  it('province_focal cannot transition to under_review (spark_focal only)', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id, { status: 'submitted' });

    const res = await request(app)
      .patch(`/api/trainings/${training._id}/status`)
      .set(authHeader(token))
      .send({ status: 'under_review' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot transition/i);
  });

  it('spark_focal can move submitted → under_review', async () => {
    const province = await createProvince();
    const { user: focal } = await createUser('province_focal', { assignedProvince: province._id });
    const { token: sparkToken } = await createUser('spark_focal');
    const training = await createTraining(focal._id, province._id, { status: 'submitted' });

    const res = await request(app)
      .patch(`/api/trainings/${training._id}/status`)
      .set(authHeader(sparkToken))
      .send({ status: 'under_review' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('under_review');
  });

  it('spark_focal can move under_review → approved', async () => {
    const province = await createProvince();
    const { user: focal } = await createUser('province_focal', { assignedProvince: province._id });
    const { token: sparkToken } = await createUser('spark_focal');
    const training = await createTraining(focal._id, province._id, { status: 'under_review' });

    const res = await request(app)
      .patch(`/api/trainings/${training._id}/status`)
      .set(authHeader(sparkToken))
      .send({ status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('for_revision requires remarks', async () => {
    const province = await createProvince();
    const { user: focal } = await createUser('province_focal', { assignedProvince: province._id });
    const { token: sparkToken } = await createUser('spark_focal');
    const training = await createTraining(focal._id, province._id, { status: 'submitted' });

    const noRemarks = await request(app)
      .patch(`/api/trainings/${training._id}/status`)
      .set(authHeader(sparkToken))
      .send({ status: 'for_revision' });
    expect(noRemarks.status).toBe(400);
    expect(noRemarks.body.message).toMatch(/remarks are required/i);

    const withRemarks = await request(app)
      .patch(`/api/trainings/${training._id}/status`)
      .set(authHeader(sparkToken))
      .send({ status: 'for_revision', remarks: 'Please fix dates' });
    expect(withRemarks.status).toBe(200);
  });

  it('province_focal can re-submit a for_revision training', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id, {
      ...submittableBody(province._id),
      status: 'for_revision',
    });

    const res = await request(app)
      .patch(`/api/trainings/${training._id}/status`)
      .set(authHeader(token))
      .send({ status: 'submitted' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('submitted');
  });

  it('returns 400 for invalid transition', async () => {
    const province = await createProvince();
    const { user: focal } = await createUser('province_focal', { assignedProvince: province._id });
    const { token: sparkToken } = await createUser('spark_focal');
    const training = await createTraining(focal._id, province._id, { status: 'draft' });

    const res = await request(app)
      .patch(`/api/trainings/${training._id}/status`)
      .set(authHeader(sparkToken))
      .send({ status: 'completed' });
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/trainings/:id/links ──────────────────────────────────────────

describe('PATCH /api/trainings/:id/links', () => {
  it('updates document links on draft training', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id);

    const res = await request(app)
      .patch(`/api/trainings/${training._id}/links`)
      .set(authHeader(token))
      .send({ attendanceFormLink: 'https://drive.google.com/attendance' });
    expect(res.status).toBe(200);
    expect(res.body.attendanceFormLink).toBe('https://drive.google.com/attendance');
  });

  it('rejects invalid URL in links update', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id);

    const res = await request(app)
      .patch(`/api/trainings/${training._id}/links`)
      .set(authHeader(token))
      .send({ terminalReportLink: 'ftp://not-allowed.com' });
    expect(res.status).toBe(400);
  });

  it('province_focal cannot update links on submitted training', async () => {
    const province = await createProvince();
    const { user, token } = await createUser('province_focal', { assignedProvince: province._id });
    const training = await createTraining(user._id, province._id, { status: 'submitted' });

    const res = await request(app)
      .patch(`/api/trainings/${training._id}/links`)
      .set(authHeader(token))
      .send({ attendanceFormLink: 'https://drive.google.com/file' });
    expect(res.status).toBe(400);
  });
});
