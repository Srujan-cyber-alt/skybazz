# ADR-0017-access-control-secrets-and-credential-brokering

**Status:** Accepted  
**Date:** 2026-07-08  
**Owners:** Security Architecture Lead, Platform Architecture Lead  
**Reviewers:** Chief AI Architect, Backend Architecture Lead, SRE Lead, Compliance Lead, Engineering Leadership

# 1. Title
Adopt centralized access control, secrets handling, and credential brokering for `apexcore`.

# 2. Status
Accepted

# 3. Context
SkyBazz APEX will invoke tools, connectors, workflows, and external systems.
That means it will need credentials, tokens, service identities, and scoped access paths.
If agents or workflows access secrets directly, the platform risks credential sprawl, privilege leakage, inconsistent rotation, weak auditability, and unsafe execution.

# 4. Decision
`apexcore` shall use centralized credential brokering and governed access control for consequential capabilities.
Secrets shall not be embedded in prompts, code, workflow definitions, or agent memory.
Agents and services shall obtain access through approved brokering patterns, scoped identities, and least-privilege controls.

# 5. Decision Drivers
- reduce secret sprawl
- enforce least privilege
- improve auditability
- support credential rotation
- prevent direct secret exposure to agents
- protect connector and tool access

# 6. Architecture Rules
1. Secrets shall be stored in approved secret-management systems only.
2. Agents shall not receive raw long-lived credentials unless explicitly approved.
3. Access shall be scoped to capability, environment, and purpose.
4. Credential brokering shall prefer short-lived tokens where possible.
5. Secret usage shall be attributable and auditable.
6. Rotation and revocation paths shall exist for consequential credentials.
7. Missing access classification for consequential capabilities shall default to deny or review.

# 7. Prohibited Patterns
- hardcoding secrets in code or config committed to source control
- embedding credentials in prompts or memory
- sharing one broad credential across unrelated capabilities
- long-lived unmanaged tokens without owner attribution
- bypassing centralized access control for production connectors

# 8. Architecture Rules

1. Access to consequential capabilities in `apexcore` shall be governed by explicit access control and credential-brokering mechanisms.
2. Secrets and credentials shall not be embedded directly in business logic or exposed to unauthorized components.
3. Credential use shall follow least-privilege principles.
4. Secret access and credential delegation shall be reviewable, auditable, and revocable.
5. Workflows requiring external credentials shall use approved brokering patterns rather than unmanaged credential distribution.

# 9. Consequences

## Positive Consequences

- Credential exposure risk is reduced.
- Access becomes easier to review and govern.
- External integrations gain a safer operational model.

## Negative Consequences

- Secret management and brokering infrastructure add complexity.
- Integration onboarding may require more operational setup.
- Misconfigured permissions can still create friction if governance is weak.

## Neutral or Operational Consequences

- Teams must maintain access reviews and rotation procedures.
- Credential lifecycle management becomes a platform concern.
- Incident response should include secret revocation and broker-level controls.

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

`apexcore` shall enforce governed access control, secrets handling, and credential brokering for consequential capabilities unless a future accepted ADR explicitly authorizes a tightly scoped exception.
