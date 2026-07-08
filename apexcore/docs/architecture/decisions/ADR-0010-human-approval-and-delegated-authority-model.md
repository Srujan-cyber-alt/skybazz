# ADR-0010-human-approval-and-delegated-authority-model

**Status:** Superseded  
**Date:** 2026-07-08  
**Owners:** Chief AI Architect, Platform Architecture Lead  
**Reviewers:** Security Architecture Lead, Governance Lead, Backend Architecture Lead, Product Leadership, Engineering Leadership  
**Supersedes:**  
**Superseded By:** ADR-0026  
**Related Documents:**  
- `apexcore/docs/architecture/README.md`
- `apexcore/docs/architecture/volume-1-part-2.md`
- `apexcore/docs/architecture/decisions/ADR-0003-governed-autonomy-model.md`
- `apexcore/docs/architecture/decisions/ADR-0006-policy-enforcement-before-execution.md`
- `apexcore/docs/architecture/decisions/ADR-0007-decision-and-action-traceability.md`
- `apexcore/docs/architecture/decisions/adr-template.md`

---

# 1. Title

Adopt a human approval and delegated authority model for consequential actions in `apexcore`.

---

# 2. Status

Accepted

---

# 3. Context

SkyBazz APEX is being designed as an Autonomous Growth Intelligence Platform that can generate recommendations, prepare actions, invoke tools, coordinate workflows, and in some cases execute actions affecting internal and external systems.

Not all actions should be treated the same.

Some actions are safe to automate fully.

Some actions are safe only within tightly bounded limits.

Some actions require explicit human approval before execution.

Some actions should never be delegated to autonomous execution at all.

Without a formal authority model, the platform risks serious failure modes:

- autonomous execution beyond intended limits
- implied authority based on technical capability rather than governance
- approval behavior implemented inconsistently across features
- confusion about whether the system acts for itself, for a tenant, or on behalf of a human
- inability to explain who was accountable for an executed action
- weak escalation behavior when uncertainty or risk rises
- policy bypass through hidden or over-broad service permissions
- accidental expansion of autonomy over time

These risks grow as the platform gains more tools, more workflows, and more connectors.

Enterprise AI governance guidance consistently emphasizes that autonomy must be bounded, approval triggers must be explicit, and delegation must be auditable and scoped rather than implied.

SkyBazz APEX therefore requires an architectural rule for:

- when approval is required
- what authority may be delegated
- how delegated authority is represented
- how escalation occurs
- how accountability is preserved

---

# 4. Decision

`apexcore` shall adopt a **human approval and delegated authority model** for consequential actions.

The platform shall distinguish clearly between:

1. recommendation authority
2. preparation authority
3. delegated execution authority
4. human approval authority
5. operational override authority

No action becomes authorized merely because a model proposed it, a workflow prepared it, or a connector can technically perform it.

Authorization shall come from explicit policy and authority context.

For consequential actions, the platform shall evaluate whether the action is:

- permitted for autonomous execution
- permitted only within delegated limits
- approval-gated
- prohibited from autonomous execution
- blocked pending escalation or exception handling

Human approval requirements and delegated authority limits shall be represented explicitly, not inferred from prompts, UI state, or undocumented code behavior.

---

# 5. Decision Drivers

- protection against unauthorized autonomous actions
- enterprise accountability requirements
- bounded autonomy design
- explicit human oversight
- least-privilege execution
- clarity about on-behalf-of behavior
- safer scaling of agent capabilities
- consistent escalation behavior
- auditability of approvals and delegation
- separation of recommendation from authority

---

# 6. Definitions

## 6.1 Recommendation Authority

The ability to analyze context and propose a decision or action.

Recommendation authority does not imply execution authority.

## 6.2 Preparation Authority

The ability to assemble drafts, plans, payloads, workflows, or action intents for possible later execution.

Preparation authority does not imply approval or execution authority.

## 6.3 Delegated Execution Authority

A bounded grant permitting the platform, workflow, or agent to execute a defined class of actions under specified limits and conditions.

Delegated authority must be explicit, scoped, and revocable.

## 6.4 Human Approval Authority

The authority of a human approver to authorize execution of actions that are outside autonomous limits or require accountable oversight.

## 6.5 Operational Override Authority

A special authority for approved emergency intervention, containment, or exceptional operational control.

Override authority must be more restricted and more heavily traced than ordinary approval authority.

## 6.6 Consequential Action

An action with material business, customer, security, financial, compliance, reputational, or data impact.

---

# 7. Alternatives Considered

## Alternative A — Prompt-based approval behavior

### Description
Use instructions in prompts or application logic to ask for approval when an action seems important.

### Why It Was Considered
This is simple for prototypes and requires limited infrastructure.

### Why It Was Not Chosen
Prompt behavior is not a reliable authority model. It is too implicit, too fragile, and too difficult to audit.

## Alternative B — Human approval for every non-read action

### Description
Require a human to approve all write or state-changing actions.

### Why It Was Considered
This maximizes caution.

### Why It Was Not Chosen
It creates excessive operational friction and prevents responsible bounded autonomy where automation would be safe and beneficial.

## Alternative C — Delegate broad authority to agents by role only

### Description
Grant wide permissions to agents based on broad roles such as “marketing agent” or “operations agent.”

### Why It Was Considered
This appears operationally simple and aligns with common role-based thinking.

### Why It Was Not Chosen
Broad role grants are too coarse. They do not express action type, limits, conditions, approval thresholds, or escalation paths precisely enough.

## Chosen Alternative — Explicit approval and delegated authority model

### Description
Represent human approvals, delegated scopes, limits, conditions, and escalation triggers as first-class architectural controls.

### Why It Was Chosen
This best balances safety, clarity, scalability, and enterprise governance needs.

---

# 8. Architecture Rules

1. Consequential actions in `apexcore` shall map to explicit approval and delegated authority requirements.
2. Authority boundaries shall define who or what may approve, execute, or override a class of action.
3. High-risk actions shall require stronger approval controls than low-risk actions.
4. Delegated authority shall be scoped, reviewable, and revocable.
5. Approval models shall be integrated with traceability, policy enforcement, and escalation controls.

# 9. Consequences

## Positive Consequences

- Human oversight becomes clearer and more consistent.
- Delegation can be scaled without losing accountability.
- High-risk operations receive stronger protection.

## Negative Consequences

- Approval workflows may slow some actions.
- Delegation design introduces governance and operational overhead.
- Misconfigured authority levels may block or over-permit actions if not reviewed carefully.

## Neutral or Operational Consequences

- Teams must classify actions by risk and authority requirements.
- Approval and delegation matrices must be maintained over time.
- Audit and review processes should cover delegation changes and exceptions.

# 10. Delegated Authority Rules

Delegated authority shall be:

- explicit
- scoped
- time-bounded where appropriate
- revocable
- attributable
- policy-constrained
- traceable

Delegated authority should define, where relevant:

- action types permitted
- target systems or resources
- financial or operational limits
- data-scope limits
- environment restrictions
- temporal limits
- required conditions
- escalation destination
- effective period
- authority source
- applicable policy version

Delegated authority must not be represented only as a role name or hidden service credential.

---

# 11. Human Approval Rules

Human approval shall be required when an action:

- exceeds delegated limits
- triggers a policy-defined approval threshold
- affects protected or highly sensitive data
- creates customer-facing consequences requiring oversight
- has destructive or irreversible impact
- enters an exception path
- lacks required confidence or evidence
- occurs under ambiguous authority conditions
- requires accountable judgment not safely reducible to automation

Approval records shall be attributable to an identified human approver or authorized approval mechanism acting on behalf of a human governance process.

Approval should not be treated as valid indefinitely if execution conditions change materially before runtime.

---

# 12. Escalation Rules

The platform shall escalate rather than execute when:

- authority scope is missing or unclear
- a policy check requires approval
- requested action exceeds a limit
- confidence or evidence is insufficient
- a conflict exists between constraints
- the target system or data scope is more sensitive than the delegated authority allows
- an exception or override path is requested
- risk scoring or governance conditions exceed an approved threshold

Escalation behavior must be explicit, traceable, and not replaceable with silent failure.

---

# 13. On-Behalf-Of Behavior

Where the platform acts on behalf of a human or tenant authority context, that behavior shall be explicit.

The architecture should preserve:

- who the originating principal was
- what authority was delegated
- what the platform or agent principal executed
- whether the action was autonomous within delegated scope or approved specifically for that action

On-behalf-of execution must not collapse human identity and system identity into one indistinguishable actor record.

---

# 14. Architecture Rules

1. Recommendation does not imply approval.
2. Approval does not replace runtime policy evaluation.
3. Delegated authority must be explicit and attributable.
4. Consequential actions must evaluate authority scope before execution.
5. Missing authority context shall default to deny, block, or escalate rather than implicit allow.
6. Human approval requirements shall be defined through policy and authority design, not only UI flow.
7. On-behalf-of execution shall preserve both delegator and executing principal context.
8. Override and exception paths require stronger traceability than normal actions.
9. Broad technical credentials shall not be treated as business authority.
10. Delegated authority should be least-privilege and reviewable over time.

---

# 15. Prohibited Patterns

The following patterns are prohibited unless a future accepted ADR explicitly authorizes them:

- treating model confidence as authority
- allowing prompt text alone to define approval behavior
- broad unrestricted agent roles for consequential execution
- executing consequential actions without attributable approval or delegated authority context
- silently reusing stale approvals after material context changes
- hiding on-behalf-of behavior behind shared service credentials
- allowing emergency override paths without explicit traceability
- inferring approval solely from workflow progression state
- equating technical connector access with governance-approved authority

---

# 16. Final Rule

`apexcore` shall enforce explicit human approval and delegated authority controls for consequential actions unless a future accepted ADR explicitly authorizes a tightly scoped exception.
