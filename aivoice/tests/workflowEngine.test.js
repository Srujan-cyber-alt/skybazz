'use strict';

const {
  createWorkflow,
  getWorkflowById,
  applyEventToWorkflow
} = require('../src/workflow/workflowEngine');

const { EVENT_TYPES } = require('../src/workflow/workflowTransitions');

describe('workflowEngine', () => {
  test('creates a workflow with default CREATED state', () => {
    const workflow = createWorkflow({
      supplierId: 'supplier-001',
      supplierName: 'Acme Supplies',
      productQuery: 'wireless headset',
      channelPreferences: ['email'],
      requiresApproval: true,
      metadata: { priority: 'high' }
    });

    expect(workflow.id).toBeDefined();
    expect(workflow.state).toBe('CREATED');
    expect(workflow.status).toBe('ACTIVE');
    expect(workflow.supplierId).toBe('supplier-001');
    expect(workflow.supplierName).toBe('Acme Supplies');
    expect(workflow.productQuery).toBe('wireless headset');
    expect(workflow.channelPreferences).toEqual(['email']);
    expect(workflow.requiresApproval).toBe(true);
    expect(workflow.metadata).toEqual({ priority: 'high' });
    expect(workflow.history).toEqual([]);
    expect(workflow.appliedEventIds).toEqual([]);
    expect(workflow.createdAt).toBeDefined();
    expect(workflow.updatedAt).toBeDefined();
  });

  test('returns workflow by id', () => {
    const created = createWorkflow({ supplierId: 'supplier-002' });
    const found = getWorkflowById(created.id);

    expect(found).not.toBeNull();
    expect(found.id).toBe(created.id);
    expect(found.supplierId).toBe('supplier-002');
  });

  test('returns null when workflow id does not exist', () => {
    expect(getWorkflowById('missing-id')).toBeNull();
  });

  test('throws when applying an event to a missing workflow', () => {
    expect(() =>
      applyEventToWorkflow('missing-id', {
        eventType: EVENT_TYPES.WORKFLOW_CREATED,
        actor: { type: 'system', id: 'system' }
      })
    ).toThrow('Workflow not found');
  });

  test('happy path reaches COMPLETED', () => {
    const workflow = createWorkflow({ supplierId: 'supplier-003' });

    let updated = applyEventToWorkflow(workflow.id, {
      eventType: EVENT_TYPES.WORKFLOW_CREATED,
      actor: { type: 'system', id: 'system' },
      payload: { step: 'created' }
    });
    expect(updated.state).toBe('ANALYZING');
    expect(updated.status).toBe('ACTIVE');
    expect(updated.history).toHaveLength(1);

    updated = applyEventToWorkflow(workflow.id, {
      eventType: EVENT_TYPES.ANALYSIS_COMPLETED,
      actor: { type: 'system', id: 'system' },
      payload: { score: 92 }
    });
    expect(updated.state).toBe('PLANNING');
    expect(updated.history).toHaveLength(2);

    updated = applyEventToWorkflow(workflow.id, {
      eventType: EVENT_TYPES.PLAN_CREATED,
      actor: { type: 'system', id: 'system' },
      payload: { channels: ['email', 'voice'] }
    });
    expect(updated.state).toBe('READY_TO_EXECUTE');
    expect(updated.history).toHaveLength(3);

    updated = applyEventToWorkflow(workflow.id, {
      eventType: EVENT_TYPES.EXECUTION_DISPATCHED,
      actor: { type: 'system', id: 'system' },
      payload: { campaignId: 'cmp-001' }
    });
    expect(updated.state).toBe('OUTREACH_ACTIVE');
    expect(updated.history).toHaveLength(4);

    updated = applyEventToWorkflow(workflow.id, {
      eventType: EVENT_TYPES.EXECUTION_DELIVERED,
      actor: { type: 'system', id: 'system' },
      payload: { delivered: true }
    });
    expect(updated.state).toBe('AWAITING_SUPPLIER');
    expect(updated.history).toHaveLength(5);

    updated = applyEventToWorkflow(workflow.id, {
      eventType: EVENT_TYPES.SUPPLIER_REPLY_RECEIVED,
      actor: { type: 'supplier', id: 'supplier-003' },
      payload: { reply: 'Interested' }
    });
    expect(updated.state).toBe('NEGOTIATING');
    expect(updated.history).toHaveLength(6);

    updated = applyEventToWorkflow(workflow.id, {
      eventType: EVENT_TYPES.NEGOTIATION_AGREED,
      actor: { type: 'system', id: 'system' },
      payload: { agreedPrice: 1200 }
    });
    expect(updated.state).toBe('DECISION_SUPPORT');
    expect(updated.history).toHaveLength(7);

    updated = applyEventToWorkflow(workflow.id, {
      eventType: EVENT_TYPES.WORKFLOW_COMPLETED,
      actor: { type: 'system', id: 'system' },
      payload: { result: 'success' }
    });
    expect(updated.state).toBe('COMPLETED');
    expect(updated.status).toBe('COMPLETED');
    expect(updated.history).toHaveLength(8);
    expect(updated.appliedEventIds).toHaveLength(8);
    expect(updated.metadata.lastEventType).toBe(EVENT_TYPES.WORKFLOW_COMPLETED);
    expect(updated.metadata.lastEventPayload).toEqual({ result: 'success' });
    expect(updated.metadata.lastEventAt).toBeDefined();
  });

  test('rejects invalid transition and does not mutate workflow', () => {
    const workflow = createWorkflow({ supplierId: 'supplier-004' });

    const updated = applyEventToWorkflow(workflow.id, {
      eventType: EVENT_TYPES.WORKFLOW_CREATED,
      actor: { type: 'system', id: 'system' }
    });

    expect(updated.state).toBe('ANALYZING');

    const before = getWorkflowById(workflow.id);

    expect(() =>
      applyEventToWorkflow(workflow.id, {
        eventType: EVENT_TYPES.WORKFLOW_COMPLETED,
        actor: { type: 'system', id: 'system' }
      })
    ).toThrow('Invalid transition: ANALYZING -> WORKFLOW_COMPLETED');

    const after = getWorkflowById(workflow.id);

    expect(after.state).toBe(before.state);
    expect(after.status).toBe(before.status);
    expect(after.history).toHaveLength(before.history.length);
    expect(after.appliedEventIds).toHaveLength(before.appliedEventIds.length);
  });

  test('duplicate event id is ignored and workflow remains unchanged', () => {
    const workflow = createWorkflow({ supplierId: 'supplier-005' });

    const event = {
      id: 'event-duplicate-001',
      eventType: EVENT_TYPES.WORKFLOW_CREATED,
      type: EVENT_TYPES.WORKFLOW_CREATED,
      workflowId: workflow.id,
      timestamp: new Date().toISOString(),
      source: 'aivoice',
      schemaVersion: '1.0.0',
      correlationId: 'corr-001',
      causationId: null,
      actor: {
        type: 'system',
        id: 'system',
        name: 'AI Voice System'
      },
      payload: {
        note: 'first apply'
      }
    };

    const first = applyEventToWorkflow(workflow.id, event);

    expect(first.state).toBe('ANALYZING');
    expect(first.history).toHaveLength(1);
    expect(first.appliedEventIds).toHaveLength(1);

    const second = applyEventToWorkflow(workflow.id, event);

    expect(second.state).toBe('ANALYZING');
    expect(second.history).toHaveLength(1);
    expect(second.appliedEventIds).toHaveLength(1);
  });

  test('can move to FAILED and close the workflow', () => {
    const workflow = createWorkflow({ supplierId: 'supplier-006' });

    applyEventToWorkflow(workflow.id, {
      eventType: EVENT_TYPES.WORKFLOW_CREATED,
      actor: { type: 'system', id: 'system' }
    });

    applyEventToWorkflow(workflow.id, {
      eventType: EVENT_TYPES.ANALYSIS_COMPLETED,
      actor: { type: 'system', id: 'system' }
    });

    applyEventToWorkflow(workflow.id, {
      eventType: EVENT_TYPES.PLAN_CREATED,
      actor: { type: 'system', id: 'system' }
    });

    const failed = applyEventToWorkflow(workflow.id, {
      eventType: EVENT_TYPES.WORKFLOW_FAILED,
      actor: { type: 'system', id: 'system' },
      payload: { reason: 'provider timeout' }
    });

    expect(failed.state).toBe('FAILED');
    expect(failed.status).toBe('CLOSED');
    expect(failed.history).toHaveLength(4);
    expect(failed.appliedEventIds).toHaveLength(4);
    expect(failed.metadata.lastEventType).toBe(EVENT_TYPES.WORKFLOW_FAILED);
    expect(failed.metadata.lastEventPayload).toEqual({ reason: 'provider timeout' });
  });
});