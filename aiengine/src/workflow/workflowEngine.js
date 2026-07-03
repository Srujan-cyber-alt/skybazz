import crypto from 'crypto';
import { WORKFLOW_STATES, TERMINAL_WORKFLOW_STATES } from './workflowStates.js';
import { getNextState } from './workflowTransitions.js';
import { createEvent, validateEvent } from '../contracts/event.contract.js';
import {
  createWorkflowRecord,
  getWorkflowRecordById,
  saveWorkflowWithEvent,
} from './workflowRepository.js';

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowDbTimestamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function buildWorkflow(input = {}) {
  const timestamp = nowDbTimestamp();

  return {
    id: crypto.randomUUID(),
    supplierId: input.supplierId,
    productId: input.productId ?? null,
    channel: input.channel ?? null,
    createdBy: input.createdBy ?? null,
    state: WORKFLOW_STATES.CREATED,
    status: 'ACTIVE',
    metadata:
      input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
        ? deepClone(input.metadata)
        : {},
    history: [],
    appliedEventIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function createWorkflow(input = {}) {
  const workflow = buildWorkflow(input);
  await createWorkflowRecord(workflow);
  return deepClone(workflow);
}

export async function getWorkflowById(workflowId) {
  const workflow = await getWorkflowRecordById(workflowId);
  return workflow ? deepClone(workflow) : null;
}

export async function applyEventToWorkflow(workflowId, eventInput = {}) {
  const workflow = await getWorkflowRecordById(workflowId);

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const normalizedEventInput = {
    ...eventInput,
    id: eventInput.id ?? crypto.randomUUID(),
    actor:
      eventInput.actor && typeof eventInput.actor === 'object' && !Array.isArray(eventInput.actor)
        ? eventInput.actor
        : eventInput.actor != null
          ? { type: 'system', id: String(eventInput.actor) }
          : {},
    timestamp: eventInput.timestamp ?? nowDbTimestamp(),
  };

  validateEvent(normalizedEventInput);

  if (workflow.appliedEventIds.includes(normalizedEventInput.id)) {
    return deepClone(workflow);
  }

  if (TERMINAL_WORKFLOW_STATES.includes(workflow.state)) {
    throw new Error(`No transitions found for current state: ${workflow.state}`);
  }

  const nextState = getNextState(workflow.state, normalizedEventInput.eventType);

  if (!nextState) {
    throw new Error(`Invalid transition: ${workflow.state} -> ${normalizedEventInput.eventType}`);
  }

  const event = createEvent({
    id: normalizedEventInput.id,
    workflowId,
    eventType: normalizedEventInput.eventType,
    actor: normalizedEventInput.actor,
    payload: normalizedEventInput.payload,
    timestamp: normalizedEventInput.timestamp,
  });

  const updatedWorkflow = {
    ...workflow,
    state: nextState,
    updatedAt: event.timestamp,
    metadata: {
      ...(workflow.metadata || {}),
      lastEventType: event.type,
      lastEventAt: event.timestamp,
      lastEventPayload:
        event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
          ? event.payload
          : {},
    },
  };

  updatedWorkflow.status = TERMINAL_WORKFLOW_STATES.includes(nextState) ? 'CLOSED' : 'ACTIVE';

  const savedWorkflow = await saveWorkflowWithEvent(updatedWorkflow, event);
  return deepClone(savedWorkflow);
}