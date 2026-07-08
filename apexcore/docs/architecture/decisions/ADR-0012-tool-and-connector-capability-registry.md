# ADR-0012-tool-and-connector-capability-registry

**Status:** Accepted  
**Date:** 2026-07-08  
**Owners:** Chief AI Architect, Platform Architecture Lead  
**Reviewers:** Integration Architecture Lead, Security Architecture Lead, Platform Engineering Lead, Governance Lead, Engineering Leadership  
**Supersedes:**  
**Superseded By:**  
**Related Documents:**  
- `apexcore/docs/architecture/README.md`
- `apexcore/docs/architecture/volume-1-part-2.md`
- `apexcore/docs/architecture/decisions/ADR-0006-policy-enforcement-before-execution.md`
- `apexcore/docs/architecture/decisions/ADR-0010-human-approval-and-delegated-authority-model.md`
- `apexcore/docs/architecture/decisions/ADR-0011-environment-and-release-gating-for-autonomous-actions.md`
- `apexcore/docs/architecture/decisions/adr-template.md`

---

# 1. Title

Adopt a governed tool and connector capability registry for `apexcore`.

---

# 2. Status

Accepted

---

# 3. Context

SkyBazz APEX is being designed as an Autonomous Growth Intelligence Platform that will reason, recommend, orchestrate workflows, invoke tools, and interact with internal and external systems.

To do that safely, the platform must know more than whether a connector technically exists.

It must know:

- what the tool or connector is
- what actions it supports
- whether those actions are read-only or state-changing
- what systems and data scopes it touches
- what environments it is allowed in
- what policies apply to it
- what authority and approval rules govern it
- who owns it
- what release posture it is in
- what operational risks it carries

Without a formal registry, the platform risks:

- shadow connectors and unmanaged integrations
- inconsistent action naming and semantics
- duplicate integrations solving the same need differently
- unclear ownership when incidents occur
- hidden write paths outside governance controls
- inability to classify blast radius by connector capability
- weak rollout discipline for experimental tools
- uneven policy enforcement across tool invocations
- connector reuse without adequate trust evaluation

A platform with governed autonomy cannot safely treat tools as informal implementation details.

Tools and connectors are operational capability surfaces.

They are part of the control plane.

Enterprise governance guidance increasingly recommends centralized agent or capability inventories and standardized integrations so access scope, ownership, and governance posture are visible and enforceable.

SkyBazz APEX therefore requires an architectural decision establishing a governed capability registry.

---

# 4. Decision

`apexcore` shall adopt a **tool and connector capability registry** as an authoritative inventory of approved tools, connectors, and callable external capability surfaces.

The registry shall record not only the existence of a tool or connector, but also the governed capabilities it exposes.

Each registered capability shall include enough metadata to support:

- execution-time policy evaluation
- authority evaluation
- environment and release gating
- auditability
- ownership and stewardship
- connector risk classification
- reuse of approved integration surfaces

No consequential tool or connector capability should be treated as production-ready unless it is represented in the registry with sufficient governance metadata.

The registry is an architectural control, not merely a documentation list.

---

# 5. Decision Drivers

- visibility into executable capability surfaces
- prevention of shadow integrations
- consistent governance across tools and connectors
- support for policy-before-execution
- support for approval and delegated authority checks
- environment and release control
- connector ownership and stewardship
- blast-radius awareness
- standardization and reuse
- safer scaling of autonomous execution

---

# 6. Definitions

## 6.1 Tool

An internal or external callable capability used by the platform to retrieve information, transform data, or perform an action.

## 6.2 Connector

An integration capability that enables communication with a third-party or internal system, service, API, or data source.

## 6.3 Capability

A specific action surface exposed by a tool or connector, such as:

- read campaign performance
- create draft email
- publish external content
- update budget
- query CRM record
- create support ticket
- upload artifact
- delete workflow resource

## 6.4 Capability Registry

A governed inventory that records tools, connectors, and their capabilities together with control-relevant metadata.

## 6.5 Capability Metadata

The structured metadata used to classify, govern, and reason about a capability, including action type, side-effect level, data sensitivity, environment constraints, ownership, and release posture.

---

# 7. Alternatives Considered

## Alternative A — Rely on code discovery and implementation knowledge

### Description
Allow engineers to understand available tools and connectors by reading code, configuration, or service definitions.

### Why It Was Considered
This requires little additional governance infrastructure.

### Why It Was Not Chosen
It is too implicit, too fragmented, and too difficult to use consistently for runtime control, reviews, audits, and safe reuse.

## Alternative B — Maintain a documentation-only integration catalog

### Description
Create a manually maintained list of integrations and their basic descriptions.

### Why It Was Considered
This improves visibility without requiring control-plane changes.

### Why It Was Not Chosen
Documentation-only catalogs drift over time and are not strong enough to support execution-time governance.

## Alternative C — Govern connectors but not individual capabilities

### Description
Track connector existence and ownership, but treat all actions inside a connector as implementation details.

### Why It Was Considered
This reduces metadata burden.

### Why It Was Not Chosen
Risk exists at the capability level. A single connector may expose both harmless reads and highly consequential writes.

## Chosen Alternative — Govern tools and connectors at the capability level

### Description
Represent callable capability surfaces explicitly with actionable governance metadata.

### Why It Was Chosen
This best supports policy enforcement, authority checks, rollout control, traceability, and safe connector reuse.

---

# 8. Architecture Rules

1. `apexcore` shall maintain a governed registry of tool and connector capabilities used by agents and workflows.
2. Tools and connectors shall declare scope, permissions, operational constraints, and ownership metadata.
3. Agents shall not invoke undeclared or ungoverned capabilities in consequential flows.
4. Capability metadata shall support policy enforcement, approval decisions, and audit review.
5. Registry entries shall be reviewed when capabilities materially change.

# 9. Consequences

## Positive Consequences

- Tool usage becomes easier to govern and reason about.
- Policy and approval systems gain clearer capability context.
- Operational risk is reduced by preventing hidden or ambiguous integrations.

## Negative Consequences

- Registry maintenance adds administrative overhead.
- Capability onboarding may take longer because metadata and review are required.
- Poorly maintained registry data could create false confidence if governance weakens.

## Neutral or Operational Consequences

- Teams must define ownership and lifecycle management for each capability.
- Tool changes should trigger registry review as part of release processes.
- Discovery and documentation processes should integrate with the registry.

# 10. Architecture Rules

1. Consequential tools and connectors shall be represented in the registry.
2. Capabilities, not just connectors, shall carry governance-relevant metadata.
3. Registry metadata shall be sufficient to support policy, authority, and release checks.
4. Read and write actions within one connector must remain distinguishable.
5. Experimental or pilot capabilities shall be explicitly marked.
6. Ownership and stewardship shall be attributable.
7. Deprecated or disabled capabilities shall remain identifiable rather than silently disappearing from governance visibility.
8. Registry usage should support runtime and review-time decision making, not only documentation.
9. Capability registration shall precede broad production use for consequential action surfaces.
10. Missing registry classification for a consequential capability shall default to block, deny, or require review rather than implicit approval.

---

# 11. Prohibited Patterns

The following patterns are prohibited unless a future accepted ADR explicitly authorizes them:

- invoking consequential connector capabilities that have no registry representation
- treating a connector as uniformly safe without capability-level distinction
- using undocumented shadow integrations for production consequential flows
- exposing new write capabilities without ownership and governance metadata
- allowing experimental capabilities to appear production-safe by omission
- bypassing policy or authority checks through hidden connector methods
- silently changing capability semantics without governance visibility
- deleting governance visibility when a capability is deprecated

---

# 12. Consequences

## Positive Consequences

- connector governance becomes clearer
- shadow integrations are easier to detect
- policy and approval logic gain better metadata
- environment and rollout control become more actionable
- incident response improves through ownership visibility
- approved capabilities become easier to reuse
- read versus write risk is modeled more accurately
- safer autonomy expansion becomes possible

## Negative Consequences

- maintaining registry metadata requires effort
- onboarding new connectors becomes more formal
- teams must classify capabilities carefully
- some integration work may move more slowly
- registry quality must be actively governed

## Neutral or Operational Consequences

- some connectors may expose many capabilities requiring grouping strategies
- registry review may become part of normal release operations
- deprecated capabilities may remain visible for governance history

---

# 13. Trade-Offs

- Benefit accepted: governable and reusable capability surfaces
- Cost accepted: more metadata, review, and lifecycle management
- Complexity accepted: capability-level classification rather than connector-level shortcuts
- Speed sacrificed: informal integration sprawl
- Risk reduced: shadow writes, unknown blast radius, and weak connector governance

---

# 14. Implementation Implications

- architecture implication: the platform needs an authoritative source of connector and tool capability metadata
- backend implication: action planning and execution should reference registered capability identifiers where feasible
- policy implication: runtime policy evaluation may depend on registry metadata
- security implication: credential and principal models should align with registered capability scope
- release implication: pilot and production posture should be expressible at capability level
- observability implication: traces should reference capability identity, not only connector names
- UX implication: operator and reviewer tooling may need registry-backed capability views
- governance implication: connector onboarding and change management should include registry updates
- testing implication: tests should cover missing-registry, deprecated-capability, and misclassified-capability scenarios
- operations implication: incident triage should be able to identify the owner and posture of any invoked capability

---

# 15. Validation

This ADR should be validated through:

- review of consequential connector use against registry coverage
- audit of capability-level metadata quality
- testing of runtime behavior when registry classification is missing or restrictive
- review of owner attribution and deprecation visibility
- incident drills using registry data to identify blast radius and ownership
- review of read-versus-write differentiation inside connectors
- governance review of pilot and production capability posture
- analysis of duplicate integrations and reuse patterns over time

## Review Trigger

This ADR should be revisited if the registry becomes too shallow, too manual, or too disconnected from actual execution behavior.

## Re-evaluation Conditions

Re-evaluate this ADR if:

- the integration architecture changes materially
- registry maintenance cost becomes disproportionate
- runtime systems cannot rely on registry metadata effectively
- shadow integrations continue despite the registry
- connector governance requires stronger standardization

---

# 16. Final Rule

`apexcore` shall use a governed tool and connector capability registry for consequential agent and workflow integrations unless a future accepted ADR explicitly authorizes a tightly scoped exception.
