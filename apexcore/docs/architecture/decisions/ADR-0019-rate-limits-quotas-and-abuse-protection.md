# ADR-0019-rate-limits-quotas-and-abuse-protection

**Status:** Accepted  
**Date:** 2026-07-08  
**Owners:** SRE Lead, Platform Engineering Lead  
**Reviewers:** Chief AI Architect, Security Architecture Lead, Backend Architecture Lead, Engineering Leadership

# 1. Title
Adopt rate limits, quotas, and abuse protection controls for `apexcore`.

# 2. Status
Accepted

# 3. Context
Autonomous and semi-autonomous systems can generate large volumes of requests, retries, tool invocations, and side effects.
Without explicit protections, bugs, loops, misconfiguration, or malicious use can create cost spikes, connector overload, unsafe action storms, or degraded service for everyone.

# 4. Decision
`apexcore` shall enforce rate limits, quotas, and abuse protections at appropriate control points for consequential requests, workflows, tools, and connectors.

# 5. Decision Drivers
- protect platform stability
- control runaway automation
- reduce abuse risk
- manage cost
- protect downstream dependencies
- preserve fair usage

# 6. Architecture Rules
1. High-impact entry points shall support rate limiting.
2. Consequential tools and connectors shall have quota-aware protections.
3. Retry behavior shall interact safely with quotas and rate controls.
4. Abuse and anomaly signals should support throttling or blocking.
5. Quotas shall be attributable to tenant, actor, capability, or environment where relevant.
6. Exceeded limits shall fail safely and observably.

# 7. Prohibited Patterns
- unlimited consequential automation in production
- unbounded retries against protected dependencies
- shared quotas with no attribution
- silent throttling without observability for operators
- disabling safeguards for convenience in production

# 8. Architecture Rules

1. `apexcore` shall enforce rate limits, quotas, and abuse protection controls for externally exposed and high-cost capabilities.
2. Limits shall reflect tenant policy, operational risk, and cost sensitivity where relevant.
3. Protective controls shall apply to both human-initiated and agent-initiated activity.
4. Limit enforcement shall be observable and reviewable.
5. Abuse protection shall degrade safely rather than silently permit harmful overuse.

# 9. Consequences

## Positive Consequences

- Platform stability and cost control improve.
- Abuse and accidental overconsumption are reduced.
- Governance can differentiate normal use from suspicious or unsafe patterns.

## Negative Consequences

- Limit tuning requires ongoing review.
- Overly strict controls may frustrate legitimate users or workflows.
- Abuse-detection heuristics may need refinement to avoid false positives.

## Neutral or Operational Consequences

- Teams must define override and escalation paths for exceptional cases.
- Monitoring should include rejected, throttled, and suspicious activity.
- Quota policy may vary by tenant, environment, or product tier.

# 10. Trust Model

The trust model for this ADR follows the principle that consequential platform behavior should rely on explicit governance, traceable inputs, and reviewable controls.

Trust in this area should increase when:

- rules are explicit
- responsibilities are defined
- changes are reviewable
- exceptions are governed
- decisions are traceable

Trust should decrease when behavior is ambiguous, undocumented, weakly governed, or difficult to review.

Where this ADR affects consequential workflows, approved architectural controls should take precedence over implicit assumptions or ad hoc implementation behavior.

# 11. Promotion Rules

Changes related to this ADR should not become durable platform standards through accidental reuse or informal convention alone.

Promotion into broader architectural practice should require, as appropriate:

- review by the relevant architecture owner
- consistency with accepted ADRs
- validation against platform governance expectations
- identification of operational consequences
- explicit documentation in repository-controlled records

Until such promotion occurs, local implementation decisions should remain local and should not be treated as platform-wide defaults.

# 12. Retrieval and Explanation Rules

Where this ADR affects retrieval, orchestration, recommendation, or execution behavior, the platform should preserve enough context to explain which architectural rule or control influenced the outcome.

Explanations should distinguish where relevant between:

- architectural policy
- implementation choice
- platform control
- workflow constraint
- approved exception

This ADR does not require exposing hidden internal chain-of-thought.

It does require preserving enough structure that consequential behavior can be understood and reviewed.

# 13. Prohibited Patterns

The following patterns are prohibited unless a future accepted ADR explicitly authorizes a tightly scoped exception:

- bypassing the governing intent of this ADR through hidden implementation shortcuts
- presenting non-governed behavior as if it were an approved platform standard
- silently overriding explicit architectural controls with convenience logic
- weakening traceability, provenance, reviewability, or accountability where this ADR requires them
- allowing repeated local exceptions to become de facto platform policy without review

# 14. Consequences

## Positive Consequences

- The platform gains clearer architectural consistency in this area.
- Governance and review become easier because expectations are explicit.
- Teams can evolve implementations with a stronger decision baseline.

## Negative Consequences

- Implementation and review effort may increase.
- Some changes may move more slowly because architectural intent must remain explicit.
- Teams may need to refactor existing work that conflicts with the normalized structure.

## Neutral or Operational Consequences

- Teams must maintain documentation and review discipline over time.
- Some workflows may require periodic reassessment as the platform evolves.
- Architecture leadership should monitor repeated exceptions or drift in this area.

# 15. Trade-Offs

- Benefit accepted: clearer architecture governance and stronger long-term consistency
- Cost accepted: additional review, documentation, and maintenance effort
- Complexity accepted: more explicit structure and control boundaries
- Speed sacrificed: some ad hoc implementation flexibility
- Risk reduced: undocumented drift, ambiguous ownership, and weak governance

# 16. Final Rule

`apexcore` shall enforce rate limits, quotas, and abuse protection for consequential and externally exposed capabilities unless a future accepted ADR explicitly authorizes a tightly scoped exception.
