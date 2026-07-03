function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  
  export function validateEvent(eventInput = {}) {
    if (!eventInput || typeof eventInput !== 'object') {
      throw new Error('Event input must be an object');
    }
  
    if (!eventInput.id || typeof eventInput.id !== 'string') {
      throw new Error('Event id is required');
    }
  
    if (!eventInput.eventType || typeof eventInput.eventType !== 'string') {
      throw new Error('Event type is required');
    }
  
    if (eventInput.actor != null && !isPlainObject(eventInput.actor)) {
      throw new Error('Event actor must be an object');
    }
  
    if (eventInput.payload != null && !isPlainObject(eventInput.payload)) {
      throw new Error('Event payload must be an object');
    }
  
    if (eventInput.timestamp != null && typeof eventInput.timestamp !== 'string') {
      throw new Error('Event timestamp must be an ISO string');
    }
  
    return true;
  }
  
  export function createEvent(input = {}) {
    validateEvent(input);
  
    return {
      id: input.id,
      workflowId: input.workflowId,
      type: input.eventType,
      actor: input.actor ?? {},
      payload: input.payload ?? {},
      timestamp: input.timestamp ?? new Date().toISOString(),
    };
  }