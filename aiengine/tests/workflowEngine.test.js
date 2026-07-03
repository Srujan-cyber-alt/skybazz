import {
    createWorkflow,
    getWorkflowById,
    applyEventToWorkflow
  } from '../src/workflow/workflowEngine.js';
  
  describe('workflowEngine', () => {
    let workflowId;
  
    beforeEach(() => {
      const workflow = createWorkflow({
        supplierId: 'supplier-001'
      });
      workflowId = workflow.id;
    });
  
    test('creates a workflow', () => {
      const workflow = getWorkflowById(workflowId);
  
      expect(workflow).toBeTruthy();
      expect(workflow.id).toBe(workflowId);
      expect(workflow.state).toBe('CREATED');
      expect(workflow.status).toBe('ACTIVE');
      expect(Array.isArray(workflow.history)).toBe(true);
      expect(Array.isArray(workflow.appliedEventIds)).toBe(true);
    });
  
    test('completes the approval path workflow', () => {
      let workflow = applyEventToWorkflow(workflowId, {
        eventType: 'WORKFLOW_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('ANALYZING');
  
      workflow = applyEventToWorkflow(workflowId, {
        eventType: 'ANALYSIS_COMPLETED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('PLANNING');
  
      workflow = applyEventToWorkflow(workflowId, {
        eventType: 'PLAN_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('DECISION_PENDING');
  
      workflow = applyEventToWorkflow(workflowId, {
        eventType: 'DECISION_MADE',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('APPROVED');
  
      workflow = applyEventToWorkflow(workflowId, {
        eventType: 'WORKFLOW_COMPLETED',
        actor: { type: 'system', id: 'system' }
      });
      expect(workflow.state).toBe('COMPLETED');
      expect(workflow.history).toHaveLength(5);
      expect(workflow.appliedEventIds).toHaveLength(5);
    });
  
    test('rejects invalid transition from APPROVED', () => {
      applyEventToWorkflow(workflowId, {
        eventType: 'WORKFLOW_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      applyEventToWorkflow(workflowId, {
        eventType: 'ANALYSIS_COMPLETED',
        actor: { type: 'system', id: 'system' }
      });
      applyEventToWorkflow(workflowId, {
        eventType: 'PLAN_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      applyEventToWorkflow(workflowId, {
        eventType: 'DECISION_MADE',
        actor: { type: 'system', id: 'system' }
      });
  
      expect(() => {
        applyEventToWorkflow(workflowId, {
          eventType: 'PLAN_CREATED',
          actor: { type: 'system', id: 'system' }
        });
      }).toThrow('Invalid transition: APPROVED -> PLAN_CREATED');
    });
  
    test('rejects transitions from COMPLETED', () => {
      applyEventToWorkflow(workflowId, {
        eventType: 'WORKFLOW_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      applyEventToWorkflow(workflowId, {
        eventType: 'ANALYSIS_COMPLETED',
        actor: { type: 'system', id: 'system' }
      });
      applyEventToWorkflow(workflowId, {
        eventType: 'PLAN_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      applyEventToWorkflow(workflowId, {
        eventType: 'DECISION_MADE',
        actor: { type: 'system', id: 'system' }
      });
      applyEventToWorkflow(workflowId, {
        eventType: 'WORKFLOW_COMPLETED',
        actor: { type: 'system', id: 'system' }
      });
  
      expect(() => {
        applyEventToWorkflow(workflowId, {
          eventType: 'DECISION_MADE',
          actor: { type: 'system', id: 'system' }
        });
      }).toThrow('No transitions found for current state: COMPLETED');
    });
  
    test('does not mutate workflow after failed event', () => {
      applyEventToWorkflow(workflowId, {
        eventType: 'WORKFLOW_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      applyEventToWorkflow(workflowId, {
        eventType: 'ANALYSIS_COMPLETED',
        actor: { type: 'system', id: 'system' }
      });
      applyEventToWorkflow(workflowId, {
        eventType: 'PLAN_CREATED',
        actor: { type: 'system', id: 'system' }
      });
      applyEventToWorkflow(workflowId, {
        eventType: 'DECISION_MADE',
        actor: { type: 'system', id: 'system' }
      });
  
      const before = getWorkflowById(workflowId);
  
      expect(() => {
        applyEventToWorkflow(workflowId, {
          eventType: 'PLAN_CREATED',
          actor: { type: 'system', id: 'system' }
        });
      }).toThrow('Invalid transition: APPROVED -> PLAN_CREATED');
  
      const after = getWorkflowById(workflowId);
  
      expect(after.state).toBe(before.state);
      expect(after.history).toHaveLength(before.history.length);
      expect(after.appliedEventIds).toHaveLength(before.appliedEventIds.length);
    });
  });