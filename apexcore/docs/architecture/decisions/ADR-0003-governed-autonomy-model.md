# ADR-0003-governed-autonomy-model

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
- `apexcore/docs/architecture/decisions/ADR-0002-bounded-context-strategy.md`
- `apexcore/docs/architecture/decisions/adr-template.md`

---

# 1. Title

Adopt a governed-autonomy model for all agentic and decision-capable behaviors within `apexcore`.

---

# 2. Status

Accepted

---

# 3. Context

SkyBazz APEX is intended to become an Autonomous Growth Intelligence Platform that can reason, recommend, plan, coordinate specialists, and support execution across multiple business-growth functions.

This means parts of the platform will behave in an agentic manner.

These behaviors may include:

- generating recommendations
- delegating tasks
- planning multi-step work
- selecting tools
- requesting data access
- proposing external actions
- initiating workflows
- triggering downstream integrations
- adapting based on contextual signals
- learning from historical outcomes

As autonomy increases, so does operational and governance risk.

In an enterprise platform, unrestricted autonomy is not acceptable for all categories of action.

Some actions may be safe to automate fully, such as low-risk internal transformations or non-destructive analysis.

Other actions require varying degrees of control because they may affect:

- customer-facing communications
- regulated data
- external systems
- budget allocation
- brand reputation
- strategic planning
- permissions
- cross-tenant isolation
- compliance obligations
- audit requirements

If no formal autonomy model exists, teams are likely to implement inconsistent decision logic around:

- approvals
- escalation
- tool access
- action scope
- retry behavior
- override authority
- audit logging
- fallback modes

This creates governance gaps and makes the platform difficult to trust, certify, and scale.

Because `apexcore` is the central platform service, autonomy must be controlled by architectural policy rather than by ad hoc feature-level decisions.

---

# 4. Decision

`apexcore` shall adopt a **governed-autonomy model**.

Autonomy shall not be treated as a binary state.

Instead, every agentic capability, tool invocation path, workflow decision path, and high-impact action path shall be assigned an autonomy level with associated controls.

The platform shall support the following autonomy levels:

1. Advisory
2. Assisted
3. Supervised
4. Conditional Autonomy
5. Restricted Full Autonomy

These levels are governance categories, not model capability claims.

No agent, workflow, or reasoning component may execute outside an assigned autonomy level and policy envelope.

---

# 5. Autonomy Levels

## 5.1 Advisory

### Definition
The system may analyze, summarize, classify, predict, or recommend, but it may not perform state-changing actions.

### Typical Use Cases
- campaign analysis
- opportunity discovery
- forecasting proposals
- content suggestions
- audience insights
- strategic recommendations

### Control Rules
- no external side effects
- no direct execution authority
- recommendation output must be attributable to a source path when feasible
- recommendations should include confidence or rationale indicators where available

## 5.2 Assisted

### Definition
The system may prepare actions, plans, drafts, or workflow proposals, but execution must be explicitly initiated by a human actor.

### Typical Use Cases
- campaign drafts
- multi-step plans
- structured briefs
- draft experiment setups
- generated workflow definitions
- pre-filled operational actions

### Control Rules
- execution requires explicit human initiation
- system must present intended action scope before execution
- high-impact drafts should include a review surface
- no hidden auto-submit behavior is allowed

## 5.3 Supervised

### Definition
The system may execute approved actions within a defined scope, but a human remains in the approval loop for sensitive or consequential operations.

### Typical Use Cases
- scheduled publishing after approval
- approved workflow runs
- limited external connector actions
- governed task delegation
- data pulls involving protected but permitted business information

### Control Rules
- explicit approval checkpoints required for sensitive action classes
- actor, approval authority, and decision time must be recorded
- policy validation must occur before execution
- actions must be abortable or reversible where technically possible
- failure paths must escalate visibly

## 5.4 Conditional Autonomy

### Definition
The system may autonomously execute within tightly defined policy boundaries, thresholds, and contextual constraints.

### Typical Use Cases
- low-risk optimization adjustments
- internal workflow routing
- retry and recovery behavior
- low-risk alert handling
- low-impact configuration adaptation within approved bounds

### Control Rules
- strict policy preconditions required
- blast-radius limits must be defined
- threshold breaches must force escalation
- anomaly detection should trigger review
- all actions must be logged for audit and evaluation
- time-bounded execution authority should be supported where applicable

## 5.5 Restricted Full Autonomy

### Definition
The system may operate without per-action approval only in narrowly defined, low-risk, policy-constrained environments where consequences are well understood and monitored.

### Typical Use Cases
- internal housekeeping tasks
- deterministic maintenance workflows
- low-risk enrichment processes
- approved internal data housekeeping
- isolated internal optimization loops with no sensitive external effects

### Control Rules
- must remain within explicit allowlists
- must not access prohibited tools or protected scopes
- must produce complete execution logs
- must remain observable in runtime monitoring
- must support immediate suspension or kill-switch behavior
- must be periodically re-certified by governance review

---

# 6. Mandatory Governance Rules

The following governance rules apply across all autonomy levels unless a stricter policy overrides them.

## 6.1 Policy Before Execution
Every state-changing action path must pass policy validation before execution.

## 6.2 Approval for High-Impact Actions
Actions that affect budget, public communication, permissions, regulated data, destructive changes, or external irreversible effects require explicit approval.

## 6.3 Least-Privilege Tool Access
Agents and workflows may access only the minimum tools, permissions, and data scopes required for their role.

## 6.4 Auditability
The platform must record who requested an action, which system proposed it, what policy was applied, what tool or workflow executed it, and what the outcome was.

## 6.5 Override and Intervention
Every supervised or autonomous execution path must provide a mechanism to halt, deny, suspend, or override the action according to operational policy.

## 6.6 Safe Failure
If approval, policy evaluation, or execution confidence cannot be established, the default behavior should be to block, degrade, or escalate rather than proceed unsafely.

## 6.7 Environment-Aware Controls
The same action may be allowed in one environment and forbidden in another. Sandboxed, staging, internal, and production environments must be governable separately.

## 6.8 Evaluation and Monitoring
Autonomous behavior must be continuously evaluated through metrics, review, and anomaly detection rather than assumed to remain safe after initial release.

---

# 7. Decision Drivers

- enterprise trust requirements
- prevention of unsafe autonomy
- governance and compliance expectations
- need for human accountability
- operational audit requirements
- support for future regulated customers
- risk control for external actions
- consistency across agent implementations
- support for controlled scaling of autonomy
- need to separate model capability from execution authority

---

# 8. Architecture Rules

1. Autonomous behavior in `apexcore` shall operate within explicit governance boundaries.
2. Agent capabilities, authority levels, and execution scope shall be defined before production use.
3. High-impact or irreversible actions shall require approval, environment gating, or other explicit controls.
4. Policies and guardrails shall be evaluated before execution, not after the fact.
5. Autonomy levels shall be reviewable, testable, and traceable to business intent.
6. Autonomous flows shall support safe interruption, fallback, and escalation paths.

# 9. Consequences

## Positive Consequences

- Autonomous behavior becomes safer and more predictable.
- Teams gain a clearer model for where humans remain in control.
- Governance requirements become easier to audit and explain.

## Negative Consequences

- Some use cases may require more upfront policy and approval design.
- Delivery speed may decrease for high-risk autonomous features.
- Additional controls may increase implementation complexity.

## Neutral or Operational Consequences

- Teams must classify actions by risk and consequence.
- Approval and escalation workflows become part of platform operations.
- Governance reviews must evolve with new autonomous capabilities.

# 10. Consequences

## Positive Consequences

- autonomy becomes governable rather than ad hoc
- human oversight is preserved where needed
- safe low-risk automation remains possible
- approvals become structured instead of inconsistent
- auditability improves
- policy enforcement becomes architecturally explicit
- teams can classify new capabilities against a shared model
- future compliance readiness improves

## Negative Consequences

- more upfront architecture and governance work is required
- approval design must be handled carefully to avoid friction
- developers must classify actions instead of treating all execution paths equally
- tooling and policy infrastructure requirements increase
- testing complexity increases across autonomy levels

## Neutral or Operational Consequences

- different product areas may use different autonomy levels
- autonomy classification may evolve over time
- governance metadata becomes part of normal system design

---

# 11. Trade-Offs

- Benefit accepted: stronger enterprise safety and trust
- Cost accepted: more policy, approval, and auditing infrastructure
- Complexity accepted: autonomy classification and differentiated controls
- Speed sacrificed: unrestricted execution speed for high-impact actions
- Risk reduced: unsafe, opaque, or unreviewed agent behavior

---

# 12. Implementation Implications

- Architecture implication: execution authority must be separated from recommendation generation
- Backend implication: workflows and tool invocations must be policy-checkable before execution
- Data implication: protected data access must be evaluated through scoped permissions
- Security implication: autonomy level should influence allowed permissions, actions, and review requirements
- Workflow implication: workflow definitions should support approval checkpoints, escalation, pause, resume, and abort
- Observability implication: runtime autonomy behavior must be logged and reviewable
- UI implication: operators must be able to see why approval is required and what will happen if approved
- Connector implication: external connector actions must declare their risk and policy category
- Testing implication: each autonomy level requires scenario-based validation and policy tests
- Governance implication: approval authorities and override rights must be defined outside model prompts

---

# 13. Control Surfaces

The platform should support the following control surfaces for governed autonomy:

- autonomy classification
- tool allowlists
- permission scopes
- environment restrictions
- approval checkpoints
- action policies
- escalation paths
- confidence thresholds where appropriate
- runtime kill switch
- audit logs
- anomaly alerts
- review dashboards
- policy versioning
- temporary execution grants with expiry where applicable

---

# 14. Prohibited Patterns

The following patterns are prohibited in `apexcore` unless superseded by a future approved ADR:

- unrestricted tool access by default
- hidden automatic execution of externally impactful actions
- direct model-to-production action pipelines without policy validation
- irreversible destructive operations without approval or explicit policy exemption
- agent access to protected data outside approved scopes
- silent retries for high-impact actions without visibility
- unlogged state-changing autonomous behavior
- approval bypass based solely on prompt instructions
- trust in model self-declared confidence as the only execution gate

---

# 15. Validation

The success of this decision should be evaluated through:

- review of action classification coverage
- audit log completeness review
- approval flow effectiveness review
- anomaly review for autonomous runs
- incident review for policy bypasses or unsafe behavior
- test coverage across autonomy levels
- review of whether tool permissions remain least-privilege
- evaluation of operator trust and intervention usability

## Review Trigger

This ADR should be revisited if the autonomy model proves too coarse, too restrictive, or repeatedly difficult to apply consistently across product areas.

## Re-evaluation Conditions

Re-evaluate this ADR if:

- new regulatory requirements materially affect oversight expectations
- the platform expands into materially higher-risk action domains
- a separate policy engine changes how autonomy is enforced
- approval friction becomes operationally unacceptable
- incident analysis shows the autonomy categories are insufficient

---

# 16. Final Rule

`apexcore` shall enforce governed autonomy boundaries for agents and workflows, with explicit guardrails, approvals, and environment gating, unless a future accepted ADR explicitly authorizes a tightly scoped exception.
