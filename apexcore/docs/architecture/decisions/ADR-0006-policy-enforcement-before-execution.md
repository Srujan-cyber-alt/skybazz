# ADR-0006-policy-enforcement-before-execution

**Status:** Accepted  
**Date:** 2026-07-08  
**Owners:** Chief AI Architect, Platform Architecture Lead  
**Reviewers:** Backend Architecture Lead, Security Architecture Lead, Governance Lead, Engineering Leadership  
**Supersedes:**  
**Superseded By:**  
**Related Documents:**  
- `apexcore/docs/architecture/README.md`
- `apexcore/docs/architecture/volume-1-part-2.md`
- `apexcore/docs/architecture/decisions/ADR-0001-architecture-principles.md`
- `apexcore/docs/architecture/decisions/ADR-0003-governed-autonomy-model.md`
- `apexcore/docs/architecture/decisions/ADR-0005-structured-output-contracts.md`
- `apexcore/docs/architecture/decisions/adr-template.md`

---

# 1. Title

Enforce policy before execution for all state-changing, externally impactful, or privilege-sensitive actions within `apexcore`.

---

# 2. Status

Accepted

---

# 3. Context

SkyBazz APEX is being designed as an Autonomous Growth Intelligence Platform with the ability to reason, recommend, prepare actions, coordinate workflows, invoke tools, and interact with external systems.

As the platform evolves, actions may be proposed or initiated by:

- human operators
- workflows
- orchestration services
- specialist agents
- connector adapters
- automated optimization loops
- system recovery flows
- approval pipelines
- delegated execution modules

Some actions are inherently higher risk than others.

Examples include:

- publishing external communications
- modifying campaign state
- changing budget allocations
- writing to third-party systems
- changing permissions
- sending customer-facing content
- storing sensitive memory artifacts
- accessing protected data scopes
- deleting or mutating operational records
- triggering irreversible external effects

If these actions are permitted based only on prompts, role assumptions, or static code paths, the system becomes unsafe.

Documentation alone is insufficient.

Approval design alone is insufficient.

Prompt wording alone is insufficient.

Because risk exists at runtime, enforcement must also exist at runtime.

A formal architectural rule is therefore required:

**No important action should execute without policy evaluation at the point of execution.**

---

# 4. Decision

`apexcore` shall enforce **policy before execution** for all actions that are:

- state-changing
- externally impactful
- permission-sensitive
- data-sensitive
- financially sensitive
- compliance-sensitive
- destructive
- approval-gated
- environment-restricted
- autonomy-governed

Every such action shall pass through a policy evaluation step before execution.

This evaluation shall occur at runtime, using current execution context, authority context, target context, environment context, and active policy state.

No module may treat policy enforcement as optional for covered actions.

Policy decisions may result in:

- allow
- deny
- escalate for approval
- require additional evidence
- modify scope
- redact content
- route to safer execution mode
- delay until conditions are met

The policy decision must occur before execution, not after.

---

# 5. Decision Drivers

- enterprise governance requirements
- prevention of unsafe execution
- real-time enforcement needs
- support for governed autonomy
- protection of sensitive systems and data
- approval integrity
- auditability
- separation of recommendation from authority
- reduction of policy bypass risk
- future compliance readiness

---

# 6. Alternatives Considered

## Alternative A — Enforce policy only through documentation and developer discipline

### Description
Publish architectural rules and rely on developers to implement them correctly in each feature.

### Why It Was Considered
This is easy to start and requires minimal infrastructure.

### Why It Was Not Chosen
This approach is too weak for an enterprise platform. Rules applied only by convention drift over time and create inconsistent enforcement.

## Alternative B — Check policy only at workflow start

### Description
Evaluate policy when a workflow or task is created, then assume downstream actions are safe to execute.

### Why It Was Considered
This reduces repeated checks and may simplify runtime implementation.

### Why It Was Not Chosen
Conditions can change between workflow creation and execution. Authority, environment, approval state, data scope, and system conditions may differ at runtime.

## Alternative C — Perform post-execution auditing only

### Description
Allow actions to execute and rely on logs and post-event review to detect violations.

### Why It Was Considered
This can support analysis and incident review without adding execution latency.

### Why It Was Not Chosen
Post-event review is not a substitute for prevention. It may explain a failure after damage has already occurred.

## Chosen Alternative — Runtime policy enforcement before execution

### Description
Every covered action is evaluated by policy immediately before it executes.

### Why It Was Chosen
This is the only approach that makes governance enforceable at the time risk becomes real.

---

# 7. Rationale

SkyBazz APEX must separate three things clearly:

1. what the system can infer
2. what the system can propose
3. what the system is authorized to execute

A model may recommend an action.

A workflow may prepare an action.

An agent may attempt an action.

None of those facts grants authority to perform the action.

Authority comes from policy.

Runtime policy enforcement is the architectural mechanism that converts governance intent into enforceable behavior.

Without it, the platform would rely on scattered feature logic, inconsistent permission checks, and assumptions hidden in prompts or controller code.

That is unacceptable for a platform intended to coordinate autonomous and semi-autonomous behavior.

Runtime policy enforcement also improves architecture quality.

It creates a dedicated control point for:

- approval requirements
- environment rules
- least-privilege evaluation
- tenant isolation checks
- data-scope enforcement
- action-category restrictions
- emergency containment
- governance versioning
- decision trace generation

It ensures that governance is not merely stated, but executed.

---

# 8. Architecture Rules

1. Policy evaluation in `apexcore` shall occur before consequential actions are executed.
2. Workflows shall not rely on post-execution review as the primary policy safeguard.
3. Policy decisions shall be traceable to inputs, rules, and outcomes where appropriate.
4. Actions that fail policy checks shall be blocked, redirected, or escalated according to governance rules.
5. Policy enforcement points shall be explicit in orchestration and execution flows.

# 9. Consequences

## Positive Consequences

- Unsafe or non-compliant actions are prevented earlier.
- Governance intent is enforced more consistently.
- Auditability improves because decision points are explicit.

## Negative Consequences

- Policy modeling and integration work increases.
- False positives in policy evaluation may temporarily block desirable actions.
- Teams must maintain policy logic as requirements evolve.

## Neutral or Operational Consequences

- Policy ownership and stewardship become ongoing operational concerns.
- Testing must include allow, deny, and escalation paths.
- Teams may need observability for policy check outcomes and latency.

# 10. Policy Outcomes

The policy layer shall support at least the following outcomes.

## 10.1 Allow
The action is permitted as requested.

## 10.2 Deny
The action is forbidden and must not execute.

## 10.3 Escalate
The action requires human review or a higher approval authority before proceeding.

## 10.4 Require Additional Evidence
The action cannot proceed until required context, approvals, data classification, or justification is supplied.

## 10.5 Reduce or Modify Scope
The action may proceed only with a narrower scope, safer configuration, or redacted payload.

## 10.6 Delay or Hold
The action may proceed only after timing, sequencing, or state conditions are satisfied.

## 10.7 Redirect
The action must be routed to a safer channel, environment, connector, or execution mode.

---

# 11. Architecture Rules

1. Covered actions shall not execute without policy evaluation.
2. Policy evaluation shall occur as close to execution time as practical.
3. Action proposals and action execution must remain architecturally separate.
4. Approval status alone is not sufficient if runtime conditions have changed materially.
5. Policy logic shall not be hidden only inside prompts or UI behavior.
6. Policy decisions must be traceable to an identifiable policy version or rule source.
7. Denied or blocked actions shall not silently continue through fallback paths that violate policy intent.
8. Emergency containment and kill-switch behavior must be supportable for autonomous action classes.
9. Policy evaluation must support environment-specific differences.
10. The absence of a policy decision for a covered action shall default to deny, block, or escalate rather than implicit allow.

---

# 12. Prohibited Patterns

The following patterns are prohibited unless a future accepted ADR explicitly authorizes them:

- direct execution of covered actions from model output without policy check
- prompt-only enforcement for permission-sensitive behavior
- one-time policy checks assumed valid indefinitely for delayed execution
- hidden connector-side writes that bypass the central policy path
- approval bypass through undocumented code paths
- implicit allow behavior when policy context is missing
- silent degradation into a different action without policy visibility
- policy rules scattered inconsistently across unrelated modules
- unlogged denials or escalations for covered actions

---

# 13. Consequences

## Positive Consequences

- unsafe execution risk is reduced
- governance becomes enforceable in production
- approval integrity improves
- audit readiness improves
- policy changes can influence runtime behavior consistently
- least-privilege principles become operationally meaningful
- autonomous behavior becomes safer to scale
- incident investigation becomes easier

## Negative Consequences

- runtime checks add architectural complexity
- policy infrastructure must be built and maintained
- execution latency may increase slightly for covered actions
- teams must model action categories more carefully
- false-positive blocking may occur if policy design is poor

## Neutral or Operational Consequences

- policy rules will evolve over time
- exception handling needs governance
- policy decision logs become part of normal operational telemetry

---

# 14. Trade-Offs

- Benefit accepted: real enforcement instead of advisory governance
- Cost accepted: more control-plane complexity
- Complexity accepted: action classification, context modeling, and decision tracing
- Speed sacrificed: direct execution convenience for covered actions
- Risk reduced: unauthorized, unsafe, or non-compliant runtime behavior

---

# 15. Implementation Implications

- architecture implication: a policy decision point must exist before execution of covered actions
- backend implication: execution services and connectors must expose policy-checkable action intents
- workflow implication: execution nodes should not assume earlier approval is sufficient without runtime verification
- security implication: identity, authorization, and policy must interoperate
- data implication: data sensitivity and tenant context should be available for policy evaluation
- observability implication: policy decisions, denials, escalations, and overrides must be logged
- connector implication: outbound integrations must not bypass policy enforcement through direct write paths
- UI implication: operators should be able to see why an action is blocked or escalated
- testing implication: covered actions require allow, deny, escalate, and missing-context test scenarios
- incident implication: policy decision traces should support forensic review

---

# 16. Final Rule

`apexcore` shall enforce applicable policies before consequential execution unless a future accepted ADR explicitly authorizes a tightly scoped exception.
