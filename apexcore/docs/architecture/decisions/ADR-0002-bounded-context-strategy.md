# ADR-0002-bounded-context-strategy

**Status:** Accepted  
**Date:** 2026-07-08  
**Owners:** Chief AI Architect, Platform Architecture Lead  
**Reviewers:** Backend Architecture Lead, Security Architecture Lead, Engineering Leadership  
**Supersedes:**  
**Superseded By:**  
**Related Documents:**  
- `apexcore/docs/architecture/README.md`
- `apexcore/docs/architecture/volume-1-part-2.md`
- `apexcore/docs/architecture/decisions/ADR-0001-architecture-principles.md`
- `apexcore/docs/architecture/decisions/adr-template.md`

---

# 1. Title

Adopt a bounded-context strategy for structuring the `apexcore` service and all future domain-aligned modules in SkyBazz APEX.

---

# 2. Status

Accepted

---

# 3. Context

SkyBazz APEX is intended to grow into a multi-domain Autonomous Growth Intelligence Platform rather than a narrow single-purpose product.

The `apexcore` service will eventually coordinate responsibilities across multiple architectural domains, including:

- core intelligence
- decisioning
- planning
- memory
- knowledge
- orchestration
- workflow execution
- governance
- analytics
- communications
- security controls
- provider abstraction

As the platform grows, the same terms may acquire different meanings in different parts of the system. For example, a “task,” “campaign,” “memory,” “action,” “plan,” or “approval” may not mean the same thing in orchestration, workflow, analytics, or governance.

Without bounded contexts, teams may begin sharing a single overloaded model across unrelated parts of the system. This often leads to:

- unclear ownership
- leaky abstractions
- duplicated or conflicting business rules
- fragile integrations
- shared-database coupling
- confusion about terminology
- slower change over time

Because `apexcore` is expected to become the platform’s central service layer, it requires a clear strategy for domain partitioning early, before implementation patterns harden into accidental architecture.

---

# 4. Decision

`apexcore` shall be designed using a **bounded-context strategy**.

The platform shall not treat the entire service as one flat domain model.

Instead, the architecture shall be divided into explicit bounded contexts, each with:

- a clear domain purpose
- an explicit responsibility boundary
- controlled ownership of business rules
- a local domain model
- explicit API or event-based interaction surfaces
- controlled persistence ownership
- restricted cross-context coupling

The initial bounded contexts for `apexcore` are defined as follows:

1. Core Intelligence Context
2. Decision Context
3. Planning Context
4. Knowledge Context
5. Memory Context
6. Agent Orchestration Context
7. Workflow Context
8. Communication Context
9. Security and Governance Context
10. Analytics and Evaluation Context
11. Platform Operations Context

These contexts define architectural boundaries, not necessarily immediate deployable microservices.

A bounded context may initially exist as an internal module boundary before it later evolves into a separate service, depending on operational needs.

---

# 5. Decision Drivers

- Domain clarity
- Long-term maintainability
- Protection against monolithic drift
- Prevention of conflicting domain models
- Support for team ownership boundaries
- Safer future service decomposition
- Reduced coupling between intelligence and execution concerns
- Better governance of memory, workflow, and decision logic
- Explicit control over data ownership
- Improved extensibility as the platform expands

---

# 6. Alternatives Considered

## Alternative A — Treat `apexcore` as one unified domain model

### Description
Use a single shared domain model across the whole service and allow all modules to operate on the same conceptual structures and persistence layer.

### Why It Was Considered
This is simpler in the short term and may reduce initial design effort.

### Why It Was Not Chosen
A single shared model would quickly become overloaded as the platform expands across memory, planning, orchestration, analytics, and governance. It would encourage coupling, create ownership confusion, and make long-term evolution harder.

## Alternative B — Split everything immediately into separate deployable microservices

### Description
Define each domain boundary as its own independently deployed service from the beginning.

### Why It Was Considered
This would maximize deployment independence and make boundaries operationally explicit.

### Why It Was Not Chosen
This would introduce excessive operational complexity too early. Early bounded contexts are valuable even before each boundary becomes its own service. Service decomposition should follow domain maturity and operational need, not happen prematurely.

## Alternative C — Organize only by technical layers

### Description
Structure the service around technical categories such as controllers, services, repositories, jobs, and providers without formal domain partitioning.

### Why It Was Considered
This is a common implementation style and is easy for many teams to start with.

### Why It Was Not Chosen
Layer-based organization alone does not protect domain boundaries. It often leads to business logic scattering across technical folders and makes strategic architectural evolution harder.

## Chosen Alternative — Use bounded contexts with gradual service decomposition

### Description
Define clear domain boundaries early, while allowing deployment topology to evolve later.

### Why It Was Chosen
This approach preserves domain clarity now without forcing premature microservice complexity.

---

# 7. Rationale

The chosen strategy is preferred because SkyBazz APEX is not simply a CRUD application with one consistent domain language.

It is a system in which multiple forms of intelligence and operations must coexist:

- reasoning
- planning
- decisioning
- memory retention
- knowledge retrieval
- workflow execution
- policy enforcement
- multi-agent coordination
- evaluation

Each of these areas has different rules, different state models, different operational concerns, and different failure modes.

Bounded contexts help preserve this separation.

They allow each domain to:

- define its own language precisely
- evolve its model independently
- own its own business rules
- expose intentional integration surfaces
- avoid unbounded shared access

This is especially important in an AI-heavy platform, where it is easy for orchestration, memory, planning, and execution to blur into one oversized subsystem if boundaries are not defined early.

The selected strategy also keeps the architecture flexible. It does not force every bounded context to become its own deployable service immediately. Instead, it allows the team to begin with domain boundaries inside the `apexcore` service and split them operationally later when justified.

---

# 8. Architecture Rules

1. `apexcore` capabilities shall be organized into explicit bounded contexts with clear domain responsibilities.
2. Cross-context interactions shall occur only through published contracts such as APIs, events, or governed data interfaces.
3. Direct database access across bounded contexts is prohibited.
4. Ownership and stewardship for each bounded context shall be documented and reviewed.
5. Changes that affect multiple bounded contexts shall undergo architecture review.
6. Shared abstractions shall not become a backdoor for hidden coupling across contexts.

# 9. Consequences

## Positive Consequences

- Domain ownership becomes clearer across the platform.
- Teams can reason about change impact with less ambiguity.
- Coupling between services and data models is reduced.

## Negative Consequences

- Initial modeling and refactoring effort increases.
- Cross-context features may require more coordination than ad hoc integrations.
- Some legacy assumptions may need to be redesigned to fit clearer boundaries.

## Neutral or Operational Consequences

- Teams must maintain context maps and interface documentation.
- Integration design becomes a formal review topic.
- Platform governance must watch for contract drift between contexts.

# 10. Implementation Implications

- Backend implication: source structure should group code by domain context before grouping by technical layer where possible
- Module implication: each major context should have clear ownership and internal boundaries
- Data implication: one context should not directly mutate another context’s internal data without an approved integration path
- API implication: cross-context interactions should use explicit contracts
- Event implication: events may be used for integration where asynchronous coordination is appropriate
- Workflow implication: workflow state should not absorb planning, reasoning, or governance logic by default
- Memory implication: memory models should remain local to the memory domain unless explicitly projected outward
- Security implication: governance and permission rules should remain controlled by the security and governance context
- Testing implication: context boundaries should be validated through contract and integration tests
- Refactoring implication: future service decomposition should be based on bounded contexts, not arbitrary file movement

---

# 11. Initial Context Definitions

## 11.1 Core Intelligence Context
Responsible for reasoning support, contextual interpretation, structured understanding, and intelligence preparation for downstream systems.

## 11.2 Decision Context
Responsible for evaluating options, constraints, policy, risk, and recommendation logic.

## 11.3 Planning Context
Responsible for decomposing approved goals and decisions into actionable plans, stages, dependencies, and checkpoints.

## 11.4 Knowledge Context
Responsible for durable business knowledge, evidence relationships, semantic structures, and reusable domain intelligence.

## 11.5 Memory Context
Responsible for working, episodic, organizational, and performance memory with access control and selective recall.

## 11.6 Agent Orchestration Context
Responsible for specialist-agent coordination, delegation, routing, retries, escalation, and agent capability boundaries.

## 11.7 Workflow Context
Responsible for deterministic multi-step process execution, durable workflow state, pause/resume behavior, and execution control.

## 11.8 Communication Context
Responsible for APIs, ingress, egress, webhook handling, connector boundaries, and event publication or subscription interfaces.

## 11.9 Security and Governance Context
Responsible for identity, authorization, policy enforcement, approvals, auditability, and safety controls.

## 11.10 Analytics and Evaluation Context
Responsible for performance analysis, evaluation metrics, experiment support, outcome review, and feedback analysis.

## 11.11 Platform Operations Context
Responsible for observability, operational control, reliability support, platform configuration, and runtime management concerns.

---

# 12. Validation

The success of this decision should be evaluated through:

- architecture review of new module proposals
- review of whether models remain context-specific
- review of whether business rules leak across boundaries
- review of whether data ownership remains explicit
- codebase analysis for coupling patterns
- integration review for cross-context contracts
- service decomposition readiness reviews over time

## Review Trigger

This ADR should be revisited if multiple contexts repeatedly require unrestricted direct access to one another or if the selected context boundaries prove consistently unclear.

## Re-evaluation Conditions

Re-evaluate this ADR if:

- the product scope changes materially
- the platform is restructured into a different service model
- operational needs require a different decomposition strategy
- the initial bounded contexts prove too coarse or too fragmented

---

# 13. Rollback or Exit Conditions

This decision should be reviewed if bounded contexts stop helping clarity and begin creating artificial fragmentation.

This decision should be superseded if a more mature context map or domain partitioning model replaces the current strategy.

This decision should not be casually discarded, because bounded contexts are the structural protection against accidental architecture collapse in a platform of this complexity.

---

# 14. Related ADRs

- `ADR-0001-architecture-principles.md`
- `ADR-0003-governed-autonomy-model.md`
- `ADR-0004-model-provider-abstraction.md`
- `ADR-0005-memory-domain-separation.md`

---

# 15. Notes

A bounded context is an architectural boundary, not a promise of immediate independent deployment.

The first responsibility of this ADR is to protect model integrity and ownership clarity.

The second responsibility is to make future service decomposition safer and less arbitrary.

Implementation teams should ask the following question before creating new modules or features:

**Which bounded context owns this concern?**

If the answer is unclear, architecture review should occur before implementation proceeds.

---

# 16. Final Rule

`apexcore` shall design and evolve major modules, workflows, memory features, orchestration behaviors, and integration surfaces in alignment with its bounded-context strategy unless a future accepted ADR explicitly supersedes or narrows that strategy.
