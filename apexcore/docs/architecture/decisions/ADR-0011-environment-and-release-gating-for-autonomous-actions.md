# ADR-0011-environment-and-release-gating-for-autonomous-actions

**Status:** Accepted  
**Date:** 2026-07-08  
**Owners:** Chief AI Architect, Platform Architecture Lead  
**Reviewers:** Platform Engineering Lead, Security Architecture Lead, Governance Lead, DevOps Lead, Engineering Leadership  
**Supersedes:**  
**Superseded By:**  
**Related Documents:**  
- `apexcore/docs/architecture/README.md`
- `apexcore/docs/architecture/volume-1-part-2.md`
- `apexcore/docs/architecture/decisions/ADR-0003-governed-autonomy-model.md`
- `apexcore/docs/architecture/decisions/ADR-0006-policy-enforcement-before-execution.md`
- `apexcore/docs/architecture/decisions/ADR-0010-human-approval-and-delegated-authority-model.md`
- `apexcore/docs/architecture/decisions/adr-template.md`

---

# 1. Title

Adopt environment and release gating for autonomous and semi-autonomous actions in `apexcore`.

---

# 2. Status

Accepted

---

# 3. Context

SkyBazz APEX is being designed as an Autonomous Growth Intelligence Platform that may operate across local development, testing, staging, sandbox, pilot, and production environments.

The platform is expected to evolve from advisory intelligence toward progressively more capable governed execution.

That evolution creates a serious architectural risk:

Autonomy that is acceptable in one environment is not automatically acceptable in another.

Examples:

- simulated campaign actions may be safe in test environments but unsafe in production
- draft generation may be acceptable broadly, while external publishing should remain heavily restricted
- internal-only tool execution may be safe in lower environments, while customer-impacting connectors require additional production controls
- experimental agent behavior may be acceptable in pilot releases but not in general availability
- write actions may require release gates even when equivalent read actions do not

Without explicit gating, the platform risks:

- accidental promotion of unsafe autonomous behaviors into production
- environment drift in governance assumptions
- hidden differences between staging and production action permissions
- premature widening of agent scope
- unsafe use of experimental models or tools in consequential environments
- weak rollback posture when autonomy must be reduced quickly
- inability to explain why an action was allowed in one environment but not another

Enterprise practice for autonomous systems favors phased rollout, contained pilots, advisory-first deployment, environment-specific controls, and explicit go-live gates before broad production autonomy.

SkyBazz APEX therefore needs a formal architectural rule governing where, when, and under what release posture autonomous behavior may execute.

---

# 4. Decision

`apexcore` shall adopt **environment and release gating** for autonomous and semi-autonomous actions.

Autonomous capability shall not be assumed uniformly across environments or release stages.

Instead, every consequential action capability shall be evaluated against both:

1. environment context
2. release or rollout context

An action that is permitted in one environment, release ring, or rollout phase may be denied, restricted, approval-gated, simulated, or disabled in another.

Environment and release gating shall apply especially to:

- state-changing actions
- customer-impacting actions
- external-system write operations
- financially sensitive actions
- destructive operations
- high-blast-radius workflow automations
- experimental or newly introduced autonomous capabilities

No consequential autonomous capability shall move into broader environments or later release stages without explicit governance and operational readiness.

---

# 5. Decision Drivers

- safe phased rollout of autonomy
- protection of production systems
- environment-aware governance
- reduction of blast radius
- support for pilot-first deployment
- clearer rollback and containment posture
- prevention of accidental capability promotion
- operational readiness discipline
- release accountability
- safer experimentation

---

# 6. Definitions

## 6.1 Environment Context

The operational environment in which a capability executes, such as local, development, test, QA, staging, sandbox, pilot, or production.

## 6.2 Release Context

The release posture of a capability, such as disabled, internal-only, advisory-only, simulated execution, pilot-enabled, limited rollout, or general availability.

## 6.3 Gated Capability

A capability whose availability or behavior depends on environment, release state, policy state, or rollout rules.

## 6.4 Autonomous Action Capability

A platform ability to perform or attempt an action without requiring step-by-step human instruction at execution time.

## 6.5 Advisory Mode

A mode in which the platform may recommend or prepare actions but not directly execute consequential external or state-changing actions.

## 6.6 Simulated Execution

A mode in which the platform runs the decision and execution path but suppresses real-world side effects, replacing them with dry-run or test behavior.

---

# 7. Alternatives Considered

## Alternative A — Uniform capability behavior across all environments

### Description
Implement a capability once and keep its behavior largely consistent across development, staging, and production.

### Why It Was Considered
This appears simpler for engineering and reduces branching behavior.

### Why It Was Not Chosen
Uniformity is unsafe for autonomous actions. Production environments require stricter controls, stronger approvals, and tighter release discipline than lower environments.

## Alternative B — Environment checks only in deployment configuration

### Description
Rely on deployment-time flags or infrastructure configuration to manage environment restrictions.

### Why It Was Considered
This keeps application code simpler.

### Why It Was Not Chosen
Deployment configuration alone is too coarse. It may not represent action class, approval state, rollout phase, or runtime release posture clearly enough.

## Alternative C — Approvals only, no release gating

### Description
Allow capabilities everywhere, but require human approval for important actions.

### Why It Was Considered
This adds oversight without introducing release-complexity.

### Why It Was Not Chosen
Approval is necessary but insufficient. Some capabilities should be unavailable entirely in certain environments or release stages regardless of approval.

## Chosen Alternative — Explicit environment and release gating

### Description
Use environment and rollout-aware controls to determine whether autonomous capabilities are disabled, advisory-only, simulated, limited, approval-gated, or enabled.

### Why It Was Chosen
This best supports safe rollout, operational readiness, and blast-radius control.

---

# 8. Architecture Rules

1. Autonomous actions in `apexcore` shall be constrained by environment and release gating controls.
2. Capability exposure shall vary by environment according to approved risk policy.
3. Production release of autonomous behavior shall require stronger controls than lower environments.
4. Gating decisions shall be explicit, reviewable, and traceable.
5. Environment-specific controls shall not be bypassed through hidden configuration or workflow shortcuts.

# 9. Consequences

## Positive Consequences

- Production risk is reduced by constraining exposure of autonomous capabilities.
- Release confidence improves through staged rollout and governance.
- Teams gain a clearer path for testing progressively higher-risk behavior.

## Negative Consequences

- Environment management and release coordination become more complex.
- Differences between environments may introduce drift if not maintained carefully.
- Some experimentation may move more slowly due to gating controls.

## Neutral or Operational Consequences

- Release procedures must include environment gate review.
- Operational tooling should surface current capability state per environment.
- Teams need testing strategies that account for environment-specific restrictions.

# 10. Environment Rules

Environment context shall influence whether a capability may:

- execute real side effects
- use live credentials
- write to production systems
- access sensitive data classes
- operate autonomously
- bypass simulation or dry-run mode
- use experimental models or tools
- expose outputs to customers or downstream production systems

Production environments shall generally enforce stricter controls than lower environments for consequential actions.

An environment that lacks required governance or observability controls shall not enable broader autonomous execution merely because the code path exists.

---

# 11. Release Gating Rules

Release gating shall support phased rollout patterns such as:

- disabled by default
- internal advisory mode
- internal simulated execution
- internal bounded execution
- pilot tenants or pilot workflows
- limited production release with explicit monitoring
- broader production release after review
- rollback to narrower mode when risk or instability rises

Release progression should require explicit readiness evidence such as:

- policy coverage
- approval integration
- traceability coverage
- observability and alerting
- incident response readiness
- test evidence for failure and deny paths
- operator documentation
- rollback capability
- owner accountability

---

# 12. Advisory, Simulated, and Live Modes

The platform shall distinguish among at least these operational modes for consequential capabilities.

## 12.1 Advisory Mode
The platform may recommend or prepare actions, but not execute consequential side effects.

## 12.2 Simulated Mode
The platform may run realistic execution paths while suppressing real-world writes or external impact.

## 12.3 Live Governed Mode
The platform may execute within approved authority, policy, environment, and release constraints.

A capability should ordinarily mature through narrower modes before broader live enablement unless a future accepted ADR explicitly approves a different path.

---

# 13. Architecture Rules

1. Consequential autonomous behavior shall be environment-aware.
2. Consequential autonomous behavior shall be release-aware.
3. Production enablement shall not be assumed from lower-environment success alone.
4. Advisory, simulated, and live modes must remain distinguishable.
5. Missing or ambiguous gating context shall default to deny, disable, simulate, or escalate rather than implicit live execution.
6. Experimental models, tools, or connectors should not be broadly production-enabled without explicit release gating.
7. Rollback to a narrower autonomy mode shall be architecturally supportable.
8. Release posture must not be hidden only in prompts or undocumented code paths.
9. Pilot or limited rollout behavior should be attributable to explicit rollout rules.
10. Environment and release gating shall complement, not replace, policy and authority checks.

---

# 14. Prohibited Patterns

The following patterns are prohibited unless a future accepted ADR explicitly authorizes them:

- assuming production autonomy because a feature worked in staging
- enabling consequential side effects in production without explicit release posture
- treating advisory-mode success as sufficient evidence for unrestricted live rollout
- using experimental tools or models in consequential live execution without gating
- hiding live-execution behavior behind unreviewed feature flags
- bypassing simulation controls through alternate code paths
- enabling broad rollout without rollback capability
- collapsing environment gating and business authority into one implicit check

---

# 15. Consequences

## Positive Consequences

- rollout of autonomy becomes safer
- blast radius is reduced
- pilot-first delivery becomes easier to govern
- rollback posture improves
- production trust increases
- operational readiness becomes more explicit
- experimentation can continue without unsafe promotion
- environment-specific controls become clearer

## Negative Consequences

- release management becomes more complex
- teams must model rollout states carefully
- environment parity becomes harder in some cases
- feature progression may be slower
- additional testing across gating modes is required

## Neutral or Operational Consequences

- some capabilities may remain advisory-only for extended periods
- different tenants or workflows may operate under different rollout states
- rollout review may become part of regular governance operations

---

# 16. Final Rule

`apexcore` shall enforce environment and release gating for autonomous actions unless a future accepted ADR explicitly authorizes a tightly scoped exception.
