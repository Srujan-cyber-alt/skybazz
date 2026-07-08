# ADR-0028-third-party-dependency-and-vendor-risk-governance

**Status:** Accepted  
**Date:** 2026-07-08  
**Owners:** Platform Architecture Lead, Security Architecture Lead  
**Reviewers:** AI Platform Lead, Data Platform Lead, Procurement Lead, Compliance Lead, Engineering Leadership  
**Supersedes:**  
**Superseded By:**  
**Related Documents:**  
- `apexcore/docs/architecture/README.md`
- `apexcore/docs/architecture/volume-1-part-2.md`
- `apexcore/docs/architecture/decisions/ADR-0001-architecture-principles.md`
- `apexcore/docs/architecture/decisions/ADR-0012-tool-and-connector-capability-registry.md`
- `apexcore/docs/architecture/decisions/ADR-0013-failure-handling-compensation-and-safe-fallbacks.md`
- `apexcore/docs/architecture/decisions/ADR-0018-tenant-isolation-boundaries-and-cross-tenant-safeguards.md`
- `apexcore/docs/architecture/decisions/ADR-0019-rate-limits-quotas-and-abuse-protection.md`
- `apexcore/docs/architecture/decisions/ADR-0027-business-continuity-and-disaster-recovery-governance.md`
- `apexcore/docs/architecture/decisions/adr-template.md`

---

# 1. Title

Third-party dependency and vendor risk governance for `apexcore`.

---

# 2. Status

Accepted

---

# 3. Context

SkyBazz APEX depends on multiple external providers and integrations to deliver platform capabilities, including model providers, data sources, SaaS tools, observability systems, identity and access providers, payments and billing, and other APIs.

These dependencies introduce risk and variability beyond the platform’s direct control.

For example:

- a model provider may change behavior, limits, or terms
- a data source may become unavailable or degraded
- a SaaS tool may suffer an outage or security incident
- a connector may be misconfigured or unexpectedly throttled
- an integration may evolve in ways that affect downstream decisions

Without explicit governance, `apexcore` risks:

- treating all vendors as equally trustworthy
- relying on single points of failure
- making consequential decisions with unreviewed dependencies
- allowing abusive or unsafe workloads through ungoverned integrations
- drifting away from compliance and contractual obligations over time
- coupling platform behavior too tightly to specific providers
- failing to respond consistently to vendor incidents or changes

The platform therefore needs a clear architectural decision about how to govern third‑party dependencies and vendor risk.

---

# 4. Decision

`apexcore` shall adopt a formal third‑party dependency and vendor risk governance model.

This model shall:

- register dependencies and vendors explicitly in a capability registry
- classify dependencies by criticality, risk level, and usage domain
- define minimum governance requirements per tier
- constrain how high‑risk or critical vendors are used in consequential workflows
- align failover, fallback, and compensation behavior with vendor risk
- require review for adding or materially changing critical dependencies
- support tenant‑safe and policy‑compliant integration patterns

The platform shall not treat all external providers as interchangeable or equally trusted.

Instead, vendor and dependency usage shall reflect explicit risk‑tiered governance and platform‑level architecture rules.

---

# 5. Decision Drivers

- protect tenants and customers from vendor‑driven instability or risk
- reduce single‑vendor and single‑dependency concentration risk
- align platform behavior with security and compliance expectations
- improve operational resilience when vendors change or fail
- make integration decisions explicit and reviewable
- enable safer use of experimental or low‑maturity providers
- preserve clarity about which external services influence consequential actions
- support clear procurement and renewal conversations with technical input

---

# 6. Definitions

## 6.1 Vendor

A vendor is an external organization that provides a service, product, model, data source, or SaaS capability consumed by `apexcore`.

## 6.2 Dependency

A dependency is any external technical resource that `apexcore` relies on for operation, including vendors, APIs, libraries, managed services, and shared infrastructure that the team does not control directly.

## 6.3 Critical Dependency

A critical dependency is a vendor or service whose failure or misbehavior would materially affect safety, correctness, compliance, or core platform availability.

## 6.4 Risk Tier

A risk tier is a classification that expresses governance expectations for a dependency, for example:

- Tier 1 — critical, high‑impact, high‑trust requirements
- Tier 2 — important, moderate impact
- Tier 3 — non‑critical, low impact or experimental

## 6.5 Consequential Workflow

A consequential workflow is any platform behavior that can materially affect customers, money, contracts, safety, compliance, or production systems.

---

# 7. Alternatives Considered

## Alternative A — Treat all vendors and dependencies uniformly

### Description

Apply a single generic policy to all external providers and dependencies.

### Why It Was Considered

Uniform policies are simple to describe and easier to automate initially.

### Why It Was Not Chosen

Different dependencies have different impact, risk, and maturity, so uniform treatment fails to protect critical workflows adequately.

## Alternative B — Let each team manage vendor risk locally

### Description

Allow individual service or feature teams to choose, integrate, and manage vendors according to local needs.

### Why It Was Considered

Local teams often move faster and know their immediate requirements well.

### Why It Was Not Chosen

Vendor choices can produce cross‑platform consequences, so uncoordinated local decisions can create systemic risk.

## Alternative C — Prohibit third‑party dependencies where possible

### Description

Minimize external integrations and rely primarily on internal implementations.

### Why It Was Considered

Reducing external dependencies can reduce some risk and increase control.

### Why It Was Not Chosen

Modern AI platforms depend on external models, tools, and services; avoiding such dependencies would severely limit capability and agility.

## Chosen Alternative — Tiered vendor risk governance integrated with capability registry

### Description

Use a capability registry to register dependencies and apply tiered governance rules by criticality, usage, and risk.

### Why It Was Chosen

This balances agility and safety, allowing safe use of external services while maintaining explicit platform‑level risk management.

---

# 8. Architecture Rules

1. `apexcore` shall maintain a registry of third‑party dependencies and vendors for platform‑level awareness.
2. Dependencies shall be classified into risk tiers based on criticality, impact, usage domain, and maturity.
3. Tier 1 (critical) dependencies shall require explicit architecture and security review before adoption or material change.
4. Consequential workflows shall prefer Tier 1 or Tier 2 dependencies that meet governance requirements over unreviewed providers.
5. Experimental or Tier 3 dependencies shall be scoped to non‑critical or sandboxed contexts with clear limitations.
6. Vendor usage patterns shall be documented for critical services, including failover, fallback, and compensation behavior.
7. When a vendor changes terms, behavior, or guarantees, affected workflows shall be reviewed for safety and compliance impact.
8. The platform shall avoid single‑vendor critical concentration where practical and shall document unavoidable single points explicitly.
9. Integrations into multi‑tenant paths shall account for tenant isolation, rate limiting, abuse protection, and data‑sharing rules.
10. Architecture and security ownership for vendor governance shall be clear, with escalation paths for incidents and material changes.

---

# 9. Consequences

## Positive Consequences

- `apexcore` gains a clearer understanding of its external dependency surface.
- Platform behavior becomes more robust to vendor changes and incidents.
- Vendor‑related risk and impact become more visible and governable.

## Negative Consequences

- Teams must perform additional work to register dependencies and evaluate tiers.
- Some integrations may move more slowly due to governance and review.
- Experimental vendors may be constrained to non‑critical contexts.

## Neutral or Operational Consequences

- Procurement, legal, and security teams may need regular input from architecture.
- Vendor assessments become recurring activities rather than one‑time events.
- Platform‑level dashboards may be required to track dependency health.

---

# 10. Trust Model

The trust model for vendor and dependency governance shall be tiered.

Trust in a dependency should increase when:

- governance review has been completed
- security and compliance expectations are documented and met
- operational characteristics (SLOs, incident history) are understood
- failover and fallback patterns are tested
- data handling and privacy guarantees are clear

Trust should decrease when:

- the provider has unclear or evolving guarantees
- the dependency becomes a hidden or undocumented critical path
- incident history or behavior indicates instability
- contractual or compliance obligations are ambiguous
- monitoring and observability for the dependency are weak

Where trust is uncertain, usage should be restricted, scoped, or accompanied by additional safeguards.

---

# 11. Promotion Rules

Use of a vendor or dependency in a limited or experimental context does not automatically make it a platform standard.

Promotion into a platform‑wide or consequential role should require:

- registration in the capability and dependency registry
- risk‑tier assessment
- architecture and security review appropriate to the tier
- documentation of usage patterns and constraints
- validation of failover, fallback, and compensation behavior
- agreement on monitoring, SLOs, and incident response expectations

Until promotion occurs, usage patterns should remain local, limited, and clearly labeled as non‑standard.

---

# 12. Retrieval and Explanation Rules

Where vendor or dependency choices materially influence outcomes, the platform should preserve enough context to explain:

- which provider or dependency was used
- which tier and governance status applies
- whether failover or fallback behavior occurred
- whether usage was within approved patterns

This ADR does not require exposing hidden reasoning text.

It does require preserving meaningful provenance and dependency information for consequential outcomes and audits.

---

# 13. Prohibited Patterns

The following patterns are prohibited unless a future accepted ADR explicitly authorizes a tightly scoped exception:

- using unregistered or unassessed vendors in consequential workflows
- treating experimental or Tier 3 dependencies as if they were Tier 1
- silently replacing critical vendors without impact assessment
- failing open when vendor governance checks or limits are uncertain
- relying on a single unreviewed provider for multi‑tenant critical paths
- allowing unbounded or abusive workloads through unmanaged integrations
- bypassing vendor governance processes through ad hoc exceptions

---

# 14. Consequences (Operational Focus)

Operationally, this ADR implies:

- service teams must collaborate with architecture and security when adopting or changing vendors
- vendor incidents will trigger platform‑level review, not only local fixes
- operational dashboards may need to expose vendor health and dependency status
- runbooks for failover and fallback will reference vendor tiers and governance constraints

Teams should factor these expectations into planning and on‑call practice.

---

# 15. Trade-Offs

- benefit accepted: stronger control over vendor‑driven risk and dependency behavior
- cost accepted: additional registration, assessment, and review effort
- complexity accepted: tiering, governance workflows, and coordination with non‑technical functions
- speed sacrificed: some reduction in rapid, ungoverned integration of external services
- risk reduced: hidden critical dependencies, unsafe vendor changes, and unmanaged third‑party exposure

---

# 16. Final Rule

`apexcore` shall govern third‑party dependencies and vendor risk using a tiered, registry‑based model so that external services can be used safely, visibly, and predictably unless a future accepted ADR explicitly supersedes or narrows these controls.