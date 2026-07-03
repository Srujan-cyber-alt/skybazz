import crypto from 'crypto';
import { getNextState } from './workflowTransitions.js';

const workflows = new Map();

function createWorkflow(input = {}) {
  const now = new Date().toISOString();

  const workflow = {
    id: crypto.randomUUID(),
    state: 'CREATED',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    supplierId: input.supplierId || null,
    supplierName: input.supplierName || null,
    productQuery: input.productQuery || null,
    channelPreferences: Array.isArray(input.channelPreferences) ? input.channelPreferences : [],
    requiresApproval: Boolean(input.requiresApproval),
    metadata: input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
      ? input.metadata
      : {},
    history: [],
    appliedEventIds: []
  };

  workflows.set(workflow.id, workflow);
  return workflow;
}

function getWorkflowById(id) {
  const workflow = workflows.get(id);

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  return workflow;
}

function applyEventToWorkflow(id, eventInput = {}) {
  const workflow = getWorkflowById(id);
  const now = new Date().toISOString();

  const nextState = getNextState(workflow.state, eventInput.eventType);

  const event = {
    id: crypto.randomUUID(),
    eventType: eventInput.eventType,
    actor: eventInput.actor || 'system',
    createdAt: now,
    payload: eventInput.payload && typeof eventInput.payload === 'object' && !Array.isArray(eventInput.payload)
      ? eventInput.payload
      : {}
  };

  workflow.state = nextState;
  workflow.updatedAt = now;
  workflow.history.push(event);
  workflow.appliedEventIds.push(event.id);

  workflows.set(workflow.id, workflow);
  return workflow;
}

export {
  createWorkflow,
  getWorkflowById,
  applyEventToWorkflow
};