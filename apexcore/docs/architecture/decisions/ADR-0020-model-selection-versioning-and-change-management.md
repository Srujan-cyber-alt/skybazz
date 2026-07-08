# ADR-0020-model-selection-versioning-and-change-management

**Status:** Accepted  
**Date:** 2026-07-08  
**Owners:** Chief AI Architect, AI Platform Lead  
**Reviewers:** Platform Architecture Lead, SRE Lead, Security Architecture Lead, Engineering Leadership

# 1. Title
Adopt model selection, versioning, and change management controls for `apexcore`.

# 2. Status
Accepted

# 3. Context
Model behavior can change materially across versions, providers, prompts, safety layers, and routing strategies.
Without explicit change management, the platform risks silent regressions, inconsistent outputs, broken evaluations, and difficult incident diagnosis.

# 4. Decision
`apexcore` shall manage model selection and model-related changes as governed architectural concerns.
Material changes to models, prompts, routing, and inference policies shall be versioned, reviewable, and evaluated before broad rollout.

# 5. Decision Drivers
- prevent silent quality regressions
- improve reproducibility
- support incident analysis
- align model changes with evaluation gates
- preserve operational confidence

# 6. Architecture Rules
1. Production-relevant model choices shall be version-identifiable.
2. Material prompt and routing changes shall be traceable and reviewable.
3. Model changes shall align with evaluation and release gating.
4. Rollback or fallback paths should exist for consequential capabilities.
5. Version context shall be preserved where it affects outputs or actions.
6. Unreviewed model changes shall not silently alter consequential behavior.

# 7. Prohibited Patterns
- changing production models with no traceable version context
- silent prompt changes for consequential workflows
- bypassing evaluation for material inference changes
- broad rollout of new models without staged validation
- treating provider defaults as harmless implementation detail

# 8. Architecture Rules

1. Model selection and version changes in `apexcore` shall be governed rather than ad hoc.
2. Consequential workflows shall identify which model versions they depend on where appropriate.
3. Model changes shall be evaluated for behavioral, operational, and governance impact before broad rollout.
4. Rollback or fallback paths shall exist for materially risky model changes.
5. Change management shall preserve traceability between release decisions and model behavior changes.

# 9. Consequences

## Positive Consequences

- Model-related regressions become easier to detect and manage.
- Release decisions gain better evidence and accountability.
- Platform behavior becomes more stable over time.

## Negative Consequences

- Change management adds process overhead.
- Teams may move more slowly when adopting new models.
- Version compatibility may create additional maintenance work.

## Neutral or Operational Consequences

- Release notes and evaluation records should reflect model changes.
- Observability should help correlate incidents with version transitions.
- Teams must maintain rollback readiness for significant model updates.

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

`apexcore` shall govern model selection, versioning, and change management for consequential workflows unless a future accepted ADR explicitly authorizes a tightly scoped exception.
