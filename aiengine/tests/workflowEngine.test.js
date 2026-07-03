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
      expect(workflow.state).toBe('PLANNING');
  
      workflow = await applyEventToWorkflow(workflowId, {
        id: 'evt-3',
        eventType: 'PLAN_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('DECISION_PENDING');
  
      workflow = await applyEventToWorkflow(workflowId, {
        id: 'evt-4',
        eventType: 'DECISION_MADE',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('APPROVED');
  
      workflow = await applyEventToWorkflow(workflowId, {
        id: 'evt-5',
        eventType: 'WORKFLOW_COMPLETED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('COMPLETED');
      expect(workflow.history).toHaveLength(5);
      expect(workflow.appliedEventIds).toHaveLength(5);
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
        eventType: 'PLAN_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-13',
        eventType: 'DECISION_MADE',
        actor: { type: 'system', id: 'system' }
      });
  
      await expect(
        applyEventToWorkflow(workflowId, {
          id: 'evt-14',
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
        eventType: 'PLAN_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-23',
        eventType: 'DECISION_MADE',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-24',
        eventType: 'WORKFLOW_COMPLETED',
        actor: { type: 'system', id: 'system' }
      });
  
      await expect(
        applyEventToWorkflow(workflowId, {
          id: 'evt-25',
          eventType: 'DECISION_MADE',
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
        eventType: 'PLAN_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      await applyEventToWorkflow(workflowId, {
        id: 'evt-33',
        eventType: 'DECISION_MADE',
        actor: { type: 'system', id: 'system' }
      });
  
      const before = await getWorkflowById(workflowId);
  
      await expect(
        applyEventToWorkflow(workflowId, {
          id: 'evt-34',
          eventType: 'PLAN_CREATED',
          actor: { type: 'system', id: 'system' }
        })
      ).rejects.toThrow('Invalid transition: APPROVED -> PLAN_CREATED');
  
      const after = await getWorkflowById(workflowId);
  
      expect(after.state).toBe(before.state);
      expect(after.history).toHaveLength(before.history.length);
      expect(after.appliedEventIds).toHaveLength(before.appliedEventIds.length);
    });
  });