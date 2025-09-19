import assert from 'assert';
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '../routes.ts';

// Minimal test harness for new extended endpoints
// NOTE: This is a lightweight smoke test, not full coverage.

describe('Extended Report Domain Routes', () => {
  let app: express.Express;

  before(async () => {
    app = express();
    app.use(express.json());
    await registerRoutes(app); // attaches routes & returns server (ignored here)
  });

  it('health check', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200, res.text);
    assert.equal(res.body.ok, true);
  });

  it('joke endpoint returns valid joke structure', async () => {
    const res = await request(app).get('/api/joke');
    assert.equal(res.status, 200, res.text);
    assert.equal(res.body.success, true);
    assert.ok(res.body.joke, 'should have joke object');
    assert.ok(res.body.joke.setup, 'should have setup');
    assert.ok(res.body.joke.punchline, 'should have punchline');
    assert.ok(res.body.joke.type, 'should have type');
  });

  let createdReportId: number;

  it('creates a report (prereq)', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({ tankId: 'TST-1', service: 'crude', diameter: '100', height: '40' });
    assert.equal(res.status, 201, res.text);
    assert.ok(res.body.id, 'report id');
    createdReportId = res.body.id;
  });

  it('returns empty components list', async () => {
    const res = await request(app).get(`/api/reports/${createdReportId}/components`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  it('adds a component', async () => {
    const res = await request(app)
      .post(`/api/reports/${createdReportId}/components`)
      .send({ componentId: 'C1', componentType: 'shell' });
    assert.equal(res.status, 200, 'status not 200: ' + res.text);
    if (!res.body.success) {
      console.error('Add component failure payload:', res.body);
    }
    assert.equal(res.body.success, true, 'success flag false: ' + JSON.stringify(res.body));
    assert.ok(res.body.data, 'no data returned: ' + JSON.stringify(res.body));
    assert.equal(res.body.data.componentId, 'C1');
  });

  it('rejects invalid component payload (missing componentId)', async () => {
    const res = await request(app)
      .post(`/api/reports/${createdReportId}/components`)
      .send({ componentType: 'shell' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('supports pagination params for components', async () => {
    const res = await request(app)
      .get(`/api/reports/${createdReportId}/components?limit=5&offset=0`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.pagination);
    assert.equal(res.body.pagination.limit, 5);
  });

  it('pagination enforces upper bound (limit>500 ignored to default 50)', async () => {
    const res = await request(app)
      .get(`/api/reports/${createdReportId}/components?limit=9999`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    // current behavior: should fall back to default 50
    assert.equal(res.body.pagination.limit, 50);
  });

  // Added pagination edge cases
  it('negative limit coerces to default 50', async () => {
    const res = await request(app)
      .get(`/api/reports/${createdReportId}/components?limit=-10`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.pagination.limit, 50);
  });

  it('negative offset coerces to 0', async () => {
    const res = await request(app)
      .get(`/api/reports/${createdReportId}/components?offset=-5`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.pagination.offset, 0);
  });

  it('large offset still returns success (empty data allowed)', async () => {
    const res = await request(app)
      .get(`/api/reports/${createdReportId}/components?offset=999999`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  it('PATCH component validates types', async () => {
    // create second component
    const createRes = await request(app)
      .post(`/api/reports/${createdReportId}/components`)
      .send({ componentId: 'C2', componentType: 'shell' });
    assert.equal(createRes.status, 200);
    const compId = createRes.body.data.id;
    const badPatch = await request(app)
      .patch(`/api/reports/${createdReportId}/components/${compId}`)
      .send({ nominalThickness: 'not-a-number' });
    assert.equal(badPatch.status, 400);
    assert.equal(badPatch.body.success, false);
  });

  it('PATCH nozzle validates types', async () => {
    const createRes = await request(app)
      .post(`/api/reports/${createdReportId}/nozzles`)
      .send({ nozzleTag: 'N1' });
    assert.equal(createRes.status, 200);
    const nzId = createRes.body.data.id;
    const badPatch = await request(app)
      .patch(`/api/reports/${createdReportId}/nozzles/${nzId}`)
      .send({ elevation: 'up' });
    assert.equal(badPatch.status, 400);
    assert.equal(badPatch.body.success, false);
  });

  it('rejects invalid nozzle payload (missing nozzleTag)', async () => {
    const res = await request(app)
      .post(`/api/reports/${createdReportId}/nozzles`)
      .send({ size: '4in' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('rejects invalid CML bulk payload (missing points)', async () => {
    const res = await request(app)
      .put(`/api/reports/${createdReportId}/cml-points/bulk`)
      .send({ parentType: 'component', parentId: 1 });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('rejects invalid shell courses payload (empty courses array)', async () => {
    const res = await request(app)
      .put(`/api/reports/${createdReportId}/shell-courses`)
      .send({ courses: [] });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('rejects invalid appendix payload (bad enum not enforced but missing shape ok)', async () => {
    const res = await request(app)
      .put(`/api/reports/${createdReportId}/appendices/A`)
      .send({ applicable: 'yes' }); // invalid type
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('rejects invalid writeup payload (wrong type)', async () => {
    const res = await request(app)
      .put(`/api/reports/${createdReportId}/writeup`)
      .send({ nextInternalYears: 'ten' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('rejects invalid tmin override payload (missing referenceType)', async () => {
    const res = await request(app)
      .post(`/api/reports/${createdReportId}/tmin-overrides`)
      .send({ referenceId: 5 });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('status aggregator returns sections', async () => {
    const res = await request(app).get(`/api/reports/${createdReportId}/status`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data);
    assert.ok(Object.prototype.hasOwnProperty.call(res.body.data, 'components'));
  });
});
