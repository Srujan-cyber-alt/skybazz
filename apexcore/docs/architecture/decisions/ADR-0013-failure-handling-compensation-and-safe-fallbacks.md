# ADR-0013-failure-handling-compensation-and-safe-fallbacks

**Status:** Accepted  
**Date:** 2026-07-08  
**Owners:** Chief AI Architect, Platform Architecture Lead  
**Reviewers:** Backend Architecture Lead, Integration Architecture Lead, Security Architecture Lead, Platform Engineering Lead, Engineering Leadership  
**Supersedes:**  
**Superseded By:**  
**Related Documents:**  
- `apexcore/docs/architecture/README.md`
- `apexcore/docs/architecture/volume-1-part-2.md`
- `apexcore/docs/architecture/decisions/ADR-0006-policy-enforcement-before-execution.md`
- `apexcore/docs/architecture/decisions/ADR-0007-decision-and-action-traceability.md`
- `apexcore/docs/architecture/decisions/ADR-0012-tool-and-connector-capability-registry.md`
- `apexcore/docs/architecture/decisions/adr-template.md`

---

# 1. Title

Adopt explicit failure handling, compensation, and safe fallbacks for consequential workflows and actions in `apexcore`.

---

# 2. Status

Accepted

---

# 3. Context

SkyBazz APEX is being designed as an Autonomous Growth Intelligence Platform that will orchestrate workflows, invoke tools, call connectors, evaluate policies, gather approvals, and execute actions across internal and external systems.

In such a platform, failure is not exceptional.

Failure is normal.

Examples include:

- timeout from external APIs
- partial success across multi-step workflows
- duplicate delivery attempts
- policy service unavailability
- stale approval state
- connector authentication failure
- downstream validation rejection
- network interruption
- race conditions between competing actions
- retries after an uncertain execution outcome

These failures become more serious when actions have side effects.

A workflow may:

- create a record in one system
- fail to update a second system
- send a message before state is committed
- execute the same write twice after retry ambiguity
- leave downstream systems inconsistent
- partially complete a customer-impacting action
- fail after a budget change but before trace completion
- trigger a destructive action with no rollback path

Without an explicit architectural position on failure handling, the platform risks:

- inconsistent recovery behavior
- unsafe retries
- duplicate or conflicting writes
- invisible partial completion
- orphaned external side effects
- operator confusion during incidents
- brittle workflow logic hidden in individual connectors
- unsafe fallback behavior that continues execution under degraded conditions

Enterprise execution systems therefore need explicit treatment of failure modes, compensating actions, idempotency assumptions, rollback expectations, and safe degradation paths.

SkyBazz APEX requires a formal rule so that failure is handled deliberately rather than ad hoc.

---

# 4. Decision

`apexcore` shall adopt **explicit failure handling, compensation, and safe fallback design** for consequential workflows and actions.

Failure handling shall be treated as an architectural concern, not merely an implementation detail inside individual services or connectors.

For consequential actions, teams shall define:

- expected failure modes
- retry behavior
- idempotency assumptions
- compensation behavior where rollback is not possible
- safe fallback behavior
- escalation behavior
- operator visibility requirements
- terminal failure behavior

The platform shall not assume that rollback is always possible.

Where direct rollback is impossible or unsafe, the architecture shall support compensating actions, explicit incomplete-state handling, and clear traceability of partial completion.

If the system cannot continue safely under degraded conditions, it shall stop, block, or escalate rather than guessing.

---

# 5. Decision Drivers

- protection against inconsistent cross-system state
- prevention of unsafe retries
- resilience of autonomous workflows
- reduction of duplicate or partial side effects
- clearer incident handling
- support for compensating actions
- operator trust and recoverability
- safer connector behavior
- auditability of failure outcomes
- explicit degraded-mode behavior

---

# 6. Definitions

## 6.1 Failure Handling

The set of behaviors used to detect, classify, surface, and respond to execution failure conditions.

## 6.2 Compensation

A follow-up action intended to reduce, offset, or reconcile the effects of a partially completed or failed workflow when direct rollback is impossible or inappropriate.

## 6.3 Safe Fallback

A reduced or alternate behavior that preserves safety and governance when the preferred execution path is unavailable.

## 6.4 Partial Completion

A state in which some workflow steps or external side effects succeeded while others did not.

## 6.5 Idempotent Action

An action that can be repeated without creating unintended additional effects beyond the intended final state.

## 6.6 Terminal Failure

A failure state where the workflow or action should stop rather than retry automatically.

---

# 7. Alternatives Considered

## Alternative A — Let each connector handle failures independently

### Description
Allow services and connectors to manage their own retries, rollback assumptions, and degraded behavior.

### Why It Was Considered
This keeps failure logic close to the implementation.

### Why It Was Not Chosen
It creates fragmented and inconsistent behavior, hides system-wide risk, and makes cross-system recovery difficult to reason about.

## Alternative B — Retry everything automatically

### Description
Treat most failures as transient and apply repeated automatic retry.

### Why It Was Considered
This may improve success rates for unstable networks or APIs.

### Why It Was Not Chosen
Blind retries can duplicate writes, amplify side effects, and worsen incidents when failure semantics are unclear.

## Alternative C — Fail fast without compensation

### Description
Stop on any failure and leave all recovery to manual intervention.

### Why It Was Considered
This is simpler and avoids unsafe automatic rollback assumptions.

### Why It Was Not Chosen
It leaves too much inconsistency unresolved and creates unnecessary operational burden for known recoverable patterns.

## Chosen Alternative — Explicit architectural failure, compensation, and fallback model

### Description
Define failure semantics, retry behavior, compensation patterns, and safe degraded modes as first-class architecture rules.

### Why It Was Chosen
This best supports resilient, governed, and understandable execution in a multi-system platform.

---

# 8. Architecture Rules

1. Consequential workflows in `apexcore` shall define failure-handling, compensation, and safe fallback behavior.
2. Partial execution scenarios shall be anticipated where actions are non-atomic.
3. Compensation behavior shall be explicit rather than assumed.
4. Fallbacks shall prioritize safety, policy compliance, and human recoverability.
5. Failure paths shall be testable and observable, not only documented.

# 9. Consequences

## Positive Consequences

- Platform resilience improves under partial failure and degraded conditions.
- Recovery becomes more predictable and reviewable.
- Unsafe continuation after errors is less likely.

## Negative Consequences

- Workflow design becomes more complex.
- Compensation logic may be difficult to design for external systems.
- Testing failure paths requires additional effort and discipline.

## Neutral or Operational Consequences

- Teams must identify critical failure modes during design.
- Observability should distinguish nominal, degraded, and compensated execution.
- Runbooks and escalation paths should align with fallback behavior.

# 10. Retry Rules

Retries shall not be universal.

Retry behavior shall depend on action semantics.

## 10.1 Safe Retry Conditions

Automatic retry may be acceptable when:

- the action is read-only
- the action is idempotent
- duplicate execution is harmless or prevented
- the failure is clearly transient
- retry bounds are defined

## 10.2 Unsafe Retry Conditions

Automatic retry should be blocked, constrained, or escalated when:

- duplicate execution could create external side effects
- idempotency is unknown
- downstream outcome is uncertain
- the action is destructive
- approval or authority may have changed
- a prior attempt may already have partially succeeded

## 10.3 Retry Controls

Where retries are used, the architecture should support:

- bounded attempts
- backoff behavior
- retry classification
- idempotency keys where relevant
- terminal failure transition
- trace visibility into retry history

---

# 11. Compensation Rules

Compensation shall be considered when a workflow can partially complete and direct rollback is impossible, unsafe, or unavailable.

Examples of compensation include:

- issuing a reversal action
- marking a resource as canceled
- creating a correcting entry
- notifying downstream operators
- opening a reconciliation task
- restoring a prior state through a separate governed action
- quarantining the affected record for review

Compensation is not the same as pretending the first action never happened.

The original action and the compensating action must both remain traceable.

---

# 12. Safe Fallback Rules

When preferred execution cannot continue safely, the platform should fall back only to modes that preserve governance and safety.

Possible safe fallbacks include:

- advisory-only output instead of execution
- simulation or dry-run instead of live write
- narrower scope execution
- queued human review
- deferred execution pending dependency recovery
- read-only mode
- blocked execution with operator explanation

Unsafe fallback patterns are prohibited.

The platform shall not silently switch to a different consequential action unless policy and traceability still apply.

---

# 13. Partial Completion Handling

The platform shall support explicit representation of partial completion.

It shall be possible to distinguish at least these outcomes where relevant:

- not started
- blocked before execution
- failed before side effects
- partially completed
- completed with compensation pending
- completed with compensation applied
- completed successfully
- terminally failed and escalated

Partial completion shall not be hidden behind generic “failed” status where side effects already occurred.

---

# 14. Architecture Rules

1. Consequential workflows shall define failure semantics explicitly.
2. Retry behavior shall depend on action semantics, not convenience alone.
3. Partial completion must be representable and traceable.
4. Compensation paths should be defined where rollback is not reliable.
5. Safe fallback behavior must preserve policy, authority, and traceability requirements.
6. Missing failure semantics for a consequential action shall default to conservative behavior.
7. Connectors shall not hide side-effect uncertainty behind generic success or error abstractions.
8. Automatic retry of destructive or ambiguous side-effect actions requires explicit justification.
9. Operators should be able to distinguish terminal failure from recoverable delay or partial completion.
10. Failure handling shall complement policy and authority controls rather than bypass them.

---

# 15. Prohibited Patterns

The following patterns are prohibited unless a future accepted ADR explicitly authorizes them:

- retrying consequential writes automatically without idempotency or equivalent protection
- treating partial completion as ordinary failure with no reconciliation path
- silently swallowing connector failures for consequential actions
- assuming rollback is always available
- falling back to a different live side-effect path without governance visibility
- hiding ambiguous execution outcomes from operators
- relying solely on manual cleanup for known recurring failure patterns
- connector-specific compensation logic with no broader platform visibility

---

# 16. Final Rule

`apexcore` shall define explicit failure-handling, compensation, and safe fallback behavior for consequential workflows unless a future accepted ADR explicitly authorizes a tightly scoped exception.
