'use strict';

const { WORKFLOW_STATES } = require('../workflow/workflowStates');

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateWorkflowInput(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error('Workflow input must be an object');
  }

  if (!isNonEmptyString(input.type)) {
    throw new Error('Workflow type is required');
  }

  if (input.referenceId !== undefined && !isNonEmptyString(input.referenceId)) {
    throw new Error('Workflow referenceId must be a non-empty string when provided');
  }

  if (input.ownerId !== undefined && !isNonEmptyString(input.ownerId)) {
    throw new Error('Workflow ownerId must be a non-empty string when provided');
  }

  if (input.metadata !== undefined && !isPlainObject(input.metadata)) {
    throw new Error('Workflow metadata must be an object when provided');
  }

  return true;
}

function validateWorkflowRecord(workflow) {
  if (!isPlainObject(workflow)) {
    throw new Error('Workflow record must be an object');
  }

  if (!isNonEmptyString(workflow.id)) {
    throw new Error('Workflow id is required');
  }

  if (!isNonEmptyString(workflow.type)) {
    throw new Error('Workflow type is required');
  }

  if (!Object.values(WORKFLOW_STATES).includes(workflow.state)) {
    throw new Error('Workflow state is invalid');
  }

  if (!isNonEmptyString(workflow.status)) {
    throw new Error('Workflow status is required');
  }

  if (!isNonEmptyString(workflow.createdAt)) {
    throw new Error('Workflow createdAt is required');
  }

  if (!isNonEmptyString(workflow.updatedAt)) {
    throw new Error('Workflow updatedAt is required');
  }

  if (workflow.referenceId !== null && workflow.referenceId !== undefined && !isNonEmptyString(workflow.referenceId)) {
    throw new Error('Workflow referenceId must be null or a non-empty string');
  }

  if (workflow.ownerId !== null && workflow.ownerId !== undefined && !isNonEmptyString(workflow.ownerId)) {
    throw new Error('Workflow ownerId must be null or a non-empty string');
  }

  if (!Array.isArray(workflow.history)) {
    throw new Error('Workflow history must be an array');
  }

  if (!Array.isArray(workflow.appliedEventIds)) {
    throw new Error('Workflow appliedEventIds must be an array');
  }

  if (!isPlainObject(workflow.metadata)) {
    throw new Error('Workflow metadata must be an object');
  }

  return true;
}

module.exports = {
  validateWorkflowInput,
  validateWorkflowRecord
};