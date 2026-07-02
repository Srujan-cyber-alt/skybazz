// tests/requests.test.js
import request from 'supertest';
import app from '../app.js';

// These tests hit your real DB configured in db.js.
// Make sure it's safe to use for tests or create a separate test database.

describe('AI Engine API', () => {
  it('health endpoint returns ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('ok');
    expect(res.body).toHaveProperty('totalRequests');
  });

  it('can create a new request with API key', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('x-api-key', 'super-secret-dev-key')
      .send({
        title: 'Test request from Jest',
        quantity: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('requestId');
    expect(res.body.title).toBe('Test request from Jest');
    expect(res.body.quantity).toBe(5);
  });

  it('rejects create without API key', async () => {
    const res = await request(app)
      .post('/api/requests')
      .send({
        title: 'Should fail',
        quantity: 1,
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('lists open requests', async () => {
    const res = await request(app).get('/api/requests?status=open&page=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('requests');
    expect(Array.isArray(res.body.requests)).toBe(true);
    expect(res.body).toHaveProperty('meta');
  });

  it('can update a request core fields', async () => {
    // First create
    const createRes = await request(app)
      .post('/api/requests')
      .set('x-api-key', 'super-secret-dev-key')
      .send({
        title: 'To be updated',
        quantity: 10,
      });

    expect(createRes.status).toBe(201);
    const requestId = createRes.body.requestId;

    // Then patch
    const patchRes = await request(app)
      .patch(`/api/requests/${requestId}`)
      .set('x-api-key', 'super-secret-dev-key')
      .send({
        title: 'Updated via test',
        quantity: 15,
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.title).toBe('Updated via test');
    expect(patchRes.body.quantity).toBe(15);
  });

  it('can soft delete a request', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/requests')
      .set('x-api-key', 'super-secret-dev-key')
      .send({
        title: 'To be deleted',
        quantity: 3,
      });

    expect(createRes.status).toBe(201);
    const requestId = createRes.body.requestId;

    // Delete
    const deleteRes = await request(app)
      .delete(`/api/requests/${requestId}`)
      .set('x-api-key', 'super-secret-dev-key');

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.status).toBe('closed');

    // Confirm status via raw
    const rawRes = await request(app).get(`/api/requests/${requestId}`);
    expect(rawRes.status).toBe(200);
    expect(rawRes.body.status).toBe('closed');
  });
});