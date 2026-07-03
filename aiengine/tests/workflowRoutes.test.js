import request from 'supertest';
import app from '../app.js';

describe('workflow routes', () => {
  test('POST /api/workflows creates a workflow', async () => {
    const response = await request(app)
      .post('/api/workflows')
      .send({
        supplierId: 'supplier-001',
        productId: 'product-001',
        channel: 'email',
        createdBy: 'system'
      });

    expect(response.status).toBe(201);
    expect(response.body).toBeTruthy();
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeTruthy();
    expect(response.body.data.id).toBeTruthy();
    expect(response.body.data.state).toBe('CREATED');
    expect(response.body.data.status).toBe('ACTIVE');
  });

  test('GET /api/workflows/:id returns created workflow', async () => {
    const createResponse = await request(app)
      .post('/api/workflows')
      .send({
        supplierId: 'supplier-002',
        productId: 'product-002',
        channel: 'email',
        createdBy: 'system'
      });

    const workflowId = createResponse.body.data.id;

    const response = await request(app).get(`/api/workflows/${workflowId}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(workflowId);
    expect(response.body.data.state).toBe('CREATED');
  });

  test('POST /api/workflows/:id/events applies WORKFLOW_CREATED event', async () => {
    const createResponse = await request(app)
      .post('/api/workflows')
      .send({
        supplierId: 'supplier-003',
        productId: 'product-003',
        channel: 'email',
        createdBy: 'system'
      });

    const workflowId = createResponse.body.data.id;

    const response = await request(app)
      .post(`/api/workflows/${workflowId}/events`)
      .send({
        eventType: 'WORKFLOW_CREATED',
        actor: 'system'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(workflowId);
    expect(response.body.data.state).toBe('ANALYZING');
  });

  test('POST /api/workflows/:id/events returns 400 for invalid transition', async () => {
    const createResponse = await request(app)
      .post('/api/workflows')
      .send({
        supplierId: 'supplier-004',
        productId: 'product-004',
        channel: 'email',
        createdBy: 'system'
      });

    const workflowId = createResponse.body.data.id;

    await request(app)
      .post(`/api/workflows/${workflowId}/events`)
      .send({
        eventType: 'WORKFLOW_CREATED',
        actor: 'system'
      });

    await request(app)
      .post(`/api/workflows/${workflowId}/events`)
      .send({
        eventType: 'ANALYSIS_COMPLETED',
        actor: 'system'
      });

    await request(app)
      .post(`/api/workflows/${workflowId}/events`)
      .send({
        eventType: 'WORKFLOW_APPROVED',
        actor: 'system'
      });

    const response = await request(app)
      .post(`/api/workflows/${workflowId}/events`)
      .send({
        eventType: 'PLAN_CREATED',
        actor: 'system'
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Invalid transition: APPROVED -> PLAN_CREATED');
  });

  test('GET /api/workflows/:id returns 404 for unknown workflow', async () => {
    const response = await request(app).get('/api/workflows/missing-id');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Workflow not found');
  });
});