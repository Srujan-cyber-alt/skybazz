const WORKFLOW_STATES = Object.freeze({
    CREATED: 'CREATED',
    ANALYZING: 'ANALYZING',
    PLANNING: 'PLANNING',
    DECISION_PENDING: 'DECISION_PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    COMPLETED: 'COMPLETED'
  });
  
  const TERMINAL_WORKFLOW_STATES = Object.freeze([
    WORKFLOW_STATES.REJECTED,
    WORKFLOW_STATES.COMPLETED
  ]);
  
  const EVENT_TYPES = Object.freeze({
    WORKFLOW_CREATED: 'WORKFLOW_CREATED',
    ANALYSIS_COMPLETED: 'ANALYSIS_COMPLETED',
    PLAN_CREATED: 'PLAN_CREATED',
    DECISION_MADE: 'DECISION_MADE',
    WORKFLOW_COMPLETED: 'WORKFLOW_COMPLETED',
    WORKFLOW_REJECTED: 'WORKFLOW_REJECTED'
  });
  
  const TRANSITIONS = Object.freeze({
    [WORKFLOW_STATES.CREATED]: {
      [EVENT_TYPES.WORKFLOW_CREATED]: WORKFLOW_STATES.ANALYZING
    },
    [WORKFLOW_STATES.ANALYZING]: {
      [EVENT_TYPES.ANALYSIS_COMPLETED]: WORKFLOW_STATES.PLANNING
    },
    [WORKFLOW_STATES.PLANNING]: {
      [EVENT_TYPES.PLAN_CREATED]: WORKFLOW_STATES.DECISION_PENDING
    },
    [WORKFLOW_STATES.DECISION_PENDING]: {
      [EVENT_TYPES.DECISION_MADE]: WORKFLOW_STATES.APPROVED,
      [EVENT_TYPES.WORKFLOW_REJECTED]: WORKFLOW_STATES.REJECTED
    },
    [WORKFLOW_STATES.APPROVED]: {
      [EVENT_TYPES.WORKFLOW_COMPLETED]: WORKFLOW_STATES.COMPLETED
    }
  });
  
  function getNextState(currentState, eventType) {
    const stateTransitions = TRANSITIONS[currentState];
  
    if (!stateTransitions) {
      throw new Error(`No transitions found for current state: ${currentState}`);
    }
  
    const nextState = stateTransitions[eventType];
  
    if (!nextState) {
      throw new Error(`Invalid transition: ${currentState} -> ${eventType}`);
    }
  
    return nextState;
  }
  
  function isValidTransition(currentState, eventType) {
    if (TERMINAL_WORKFLOW_STATES.includes(currentState)) {
      return false;
    }
  
    return Boolean(TRANSITIONS[currentState] && TRANSITIONS[currentState][eventType]);
  }
  
  export {
    WORKFLOW_STATES,
    TERMINAL_WORKFLOW_STATES,
    EVENT_TYPES,
    TRANSITIONS,
    getNextState,
    isValidTransition
  };