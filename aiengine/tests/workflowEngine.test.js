import {
    createWorkflow,
    getWorkflowById,
    applyEventToWorkflow
  } from '../src/workflow/workflowEngine.js';
  
  describe('workflowEngine', () => {
    let workflowId;
  
    beforeEach(async () => {
      const workflow = await createWorkflow({
        supplierId: 'supplier-001'
      });
      workflowId = workflow.id;
    });
  
    test('creates a workflow', async () => {
      const workflow = await getWorkflowById(workflowId);
  
      expect(workflow).toBeTruthy();
      expect(workflow.id).toBe(workflowId);
      expect(workflow.state).toBe('CREATED');
      expect(workflow.status).toBe('ACTIVE');
      expect(Array.isArray(workflow.history)).toBe(true);
      expect(Array.isArray(workflow.appliedEventIds)).toBe(true);
    });
  
    test('completes the approval path workflow', async () => {
      let workflow = await applyEventToWorkflow(workflowId, {
        id: 'evt-1',
        eventType: 'WORKFLOW_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('ANALYZING');
  
      workflow = await applyEventToWorkflow(workflowId, {
        id: 'evt-2',
        eventType: 'ANALYSIS_COMPLETED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('PLAN_READY');
  
      workflow = await applyEventToWorkflow(workflowId, {
        id: 'evt-3',
        eventType: 'WORKFLOW_APPROVED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('APPROVED');
  
      workflow = await applyEventToWorkflow(workflowId, {
        id: 'evt-4',
        eventType: 'EXECUTION_READY',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('READY_TO_EXECUTE');
  
      workflow = await applyEventToWorkflow(workflowId, {
        id: 'evt-5',
        eventType: 'OUTREACH_STARTED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('OUTREACH_ACTIVE');
  
      workflow = await applyEventToWorkflow(workflowId, {
        id: 'evt-6',
        eventType: 'SUPPLIER_RESPONSE_RECEIVED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('AWAITING_SUPPLIER');
  
      workflow = await applyEventToWorkflow(workflowId, {
        id: 'evt-7',
        eventType: 'NEGOTIATION_STARTED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('NEGOTIATING');
  
      workflow = await applyEventToWorkflow(workflowId, {
        id: 'evt-8',
        eventType: 'DOCUMENTS_SUBMITTED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('DOCUMENT_REVIEW');
  
      workflow = await applyEventToWorkflow(workflowId, {
        id: 'evt-9',
        eventType: 'DECISION_SUPPORT_REQUESTED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('DECISION_SUPPORT');
  
      workflow = await applyEventToWorkflow(workflowId, {
        id: 'evt-10',
        eventType: 'WORKFLOW_COMPLETED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('COMPLETED');
      expect(workflow.history).toHaveLength(10);
      expect(workflow.appliedEventIds).toHaveLength(10);
    });
  
    test('rejects invalid transition from APPROVED', async () => {
      await applyEventToWorkflow(workflowId, {
        id: 'evt-10',
        eventType: 'WORKFLOW_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-11',
        eventType: 'ANALYSIS_COMPLETED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-12',
        eventType: 'WORKFLOW_APPROVED',
        actor: { type: 'system', id: 'system' }
      });
  
      await expect(
        applyEventToWorkflow(workflowId, {
          id: 'evt-13',
          eventType: 'PLAN_CREATED',
          actor: { type: 'system', id: 'system' }
        })
      ).rejects.toThrow('Invalid transition: APPROVED -> PLAN_CREATED');
    });
  
    test('rejects transitions from COMPLETED', async () => {
      await applyEventToWorkflow(workflowId, {
        id: 'evt-20',
        eventType: 'WORKFLOW_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-21',
        eventType: 'ANALYSIS_COMPLETED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-22',
        eventType: 'WORKFLOW_APPROVED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-23',
        eventType: 'EXECUTION_READY',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-24',
        eventType: 'OUTREACH_STARTED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-25',
        eventType: 'SUPPLIER_RESPONSE_RECEIVED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-26',
        eventType: 'NEGOTIATION_STARTED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-27',
        eventType: 'DOCUMENTS_SUBMITTED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-28',
        eventType: 'DECISION_SUPPORT_REQUESTED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-29',
        eventType: 'WORKFLOW_COMPLETED',
        actor: { type: 'system', id: 'system' }
      });
  
      await expect(
        applyEventToWorkflow(workflowId, {
          id: 'evt-30',
          eventType: 'WORKFLOW_APPROVED',
          actor: { type: 'system', id: 'system' }
        })
      ).rejects.toThrow('No transitions found for current state: COMPLETED');
    });
  
    test('does not mutate workflow after failed event', async () => {
      await applyEventToWorkflow(workflowId, {
        id: 'evt-30',
        eventType: 'WORKFLOW_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-31',
        eventType: 'ANALYSIS_COMPLETED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-32',
        eventType: 'WORKFLOW_APPROVED',
        actor: { type: 'system', id: 'system' }
      });
  
      const before = await getWorkflowById(workflowId);
  
      await expect(
        applyEventToWorkflow(workflowId, {
          id: 'evt-33',
          eventType: 'PLAN_CREATED',
          actor: { type: 'system', id: 'system' }
        })
      ).rejects.toThrow('Invalid transition: APPROVED -> PLAN_CREATED');
  
      const after = await getWorkflowById(workflowId);
  
      expect(after.state).toBe(before.state);
      expect(after.history).toHaveLength(before.history.length);
      expect(after.appliedEventIds).toHaveLength(before.appliedEventIds.length);
    });
  
    test('cancels workflow from ANALYZING', async () => {
      await applyEventToWorkflow(workflowId, {
        id: 'evt-40',
        eventType: 'WORKFLOW_CREATED',
        actor: { type: 'system', id: 'system' }
      });
  
      const workflow = await applyEventToWorkflow(workflowId, {
        id: 'evt-41',
        eventType: 'WORKFLOW_CANCELLED',
        actor: { type: 'system', id: 'system' }
      });
  
      expect(workflow.state).toBe('CANCELLED');
      expect(workflow.history).toHaveLength(2);
      expect(workflow.appliedEventIds).toHaveLength(2);
    });
  });