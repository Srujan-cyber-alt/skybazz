# ADR-0005-structured-output-contracts

**Status:** Accepted  
**Date:** 2026-07-08  
**Owners:** Chief AI Architect, Platform Architecture Lead  
**Reviewers:** Backend Architecture Lead, AI Platform Lead, Data Architecture Lead, Engineering Leadership  
**Supersedes:**  
**Superseded By:**  
**Related Documents:**  
- `apexcore/docs/architecture/README.md`
- `apexcore/docs/architecture/volume-1-part-2.md`
- `apexcore/docs/architecture/decisions/ADR-0001-architecture-principles.md`
- `apexcore/docs/architecture/decisions/ADR-0004-model-provider-abstraction.md`
- `apexcore/docs/architecture/decisions/adr-template.md`

---

# 1. Title

Adopt structured-output contracts for machine-consumed AI responses within `apexcore`.

---

# 2. Status

Accepted

---

# 3. Context

SkyBazz APEX is being designed as an enterprise Autonomous Growth Intelligence Platform with deep reliance on AI-assisted reasoning, planning, orchestration, evaluation, and workflow coordination.

Many AI responses in the platform will not be read only by humans.

They will often be consumed by:

- internal services
- workflow engines
- orchestration components
- policy evaluators
- approval systems
- analytics pipelines
- memory services
- downstream automation layers
- connector adapters
- operator interfaces

When machine-consumed outputs are generated as unconstrained free text, the system becomes fragile.

Free-form output creates risks such as:

- parsing failures
- missing fields
- ambiguous intent
- schema drift
- inconsistent naming
- hidden assumptions
- brittle downstream logic
- invalid automation triggers
- poor auditability
- increased retry complexity

In a platform where AI outputs may influence planning, approvals, workflows, routing, and execution preparation, these risks are architecturally significant.

Because `apexcore` is intended to coordinate intelligence and operational workflows, machine-consumed AI responses must be contract-driven rather than prompt-hoped.

---

# 4. Decision

`apexcore` shall adopt **structured-output contracts** for all AI responses that are intended for machine consumption, workflow continuation, policy evaluation, storage as typed operational state, or automated downstream processing.

Free-form natural language responses may still be used for human-facing advisory interfaces.

However, whenever a response is intended to drive logic or system state, the output shall conform to an explicit schema or equivalent typed contract.

The structured-output approach shall include:

- explicit output schemas
- validation before downstream use
- standardized failure handling for invalid outputs
- controlled retry or regeneration behavior
- separation between human-readable explanation and machine-readable payload
- versioned contracts for important output classes

The preferred design principle is:

**If software must interpret it, it must be structured.**

---

# 5. Decision Drivers

- reliability of downstream automation
- reduction of parsing fragility
- support for provider abstraction
- safer workflow continuation
- machine-readability of reasoning outputs
- schema validation requirements
- auditability of AI-generated decisions
- prevention of hidden output drift
- improved testability
- clearer contracts between intelligence and execution layers

---

# 6. Alternatives Considered

## Alternative A — Use free-text outputs with prompt instructions only

### Description
Ask models to produce “JSON-like” or structured-looking responses through prompt wording, then parse them heuristically.

### Why It Was Considered
This is simple to start with and may work in prototypes.

### Why It Was Not Chosen
This is too fragile for enterprise platform workflows. It leads to malformed outputs, inconsistent fields, brittle parsing, and unreliable automation.

## Alternative B — Parse free text with custom post-processors

### Description
Allow models to return general prose and use regex, heuristics, or custom parsers to infer structured meaning afterward.

### Why It Was Considered
This avoids requiring model-side schema support.

### Why It Was Not Chosen
This introduces hidden ambiguity, increases maintenance cost, and shifts reliability problems into custom parsing logic that is itself error-prone.

## Alternative C — Use structured outputs only in a few sensitive areas

### Description
Apply schema-driven outputs only to selected workflows while leaving most machine-consumed responses as free text.

### Why It Was Considered
This reduces initial platform work.

### Why It Was Not Chosen
This would create inconsistency across the architecture, make integration rules unclear, and allow fragile patterns to spread into core workflows.

## Chosen Alternative — Structured outputs for all machine-consumed AI responses

### Description
Require typed, validated outputs wherever AI results will be consumed by software rather than only read by humans.

### Why It Was Chosen
This is the most reliable way to integrate AI into production-grade workflows and preserves clean boundaries between intelligence generation and execution logic.

---

# 7. Rationale

SkyBazz APEX is not being built as a chat-only product.

It is being built as an intelligent operating platform.

That means AI-generated outputs will often become inputs to other software.

Examples include:

- recommendation objects
- plan structures
- task decomposition outputs
- routing decisions
- scoring results
- extracted business facts
- approval requests
- policy check inputs
- workflow transition decisions
- memory write candidates
- experiment proposals
- evaluation summaries

These are not merely text responses.

They are operational artifacts.

Operational artifacts require contracts.

Structured-output contracts create a stable boundary between AI and software.

They make it possible to:

- validate required fields
- reject malformed responses
- normalize outputs across providers
- version contracts safely
- test downstream consumers deterministically
- audit what the system believed it received
- evolve schema definitions over time

This decision also complements provider abstraction.

If model responses are normalized into internal contracts, the rest of the platform depends on internal meaning rather than provider-specific formatting behavior.

That is essential for long-term maintainability.

---

# 8. Architecture Rules

1. Consequential AI outputs in `apexcore` shall conform to explicit structured output contracts.
2. Contracts shall define required fields, types, and validation expectations.
3. Downstream systems shall not depend on free-form model output where a governed contract is required.
4. Contract validation shall occur before output is accepted into consequential workflows.
5. Contract evolution shall be versioned and reviewed to prevent breaking consumers.

# 9. Consequences

## Positive Consequences

- Downstream integrations become more reliable and predictable.
- Validation failures are easier to detect and diagnose.
- Governance and testing improve because expected output structure is explicit.

## Negative Consequences

- Contract design introduces additional upfront work.
- Some flexibility in free-form outputs is intentionally reduced.
- Contract evolution requires coordination across producers and consumers.

## Neutral or Operational Consequences

- Teams must maintain schemas and validation logic.
- Versioning becomes part of output lifecycle management.
- QA must include malformed and edge-case contract testing.

# 10. Scope

Structured-output contracts shall be required for AI outputs used in:

- workflow continuation decisions
- plan generation for machine execution
- action proposals entering approval systems
- extracted entity or fact objects
- structured memory write candidates
- policy-check input generation
- ranking or scoring artifacts
- orchestration routing instructions
- connector preparation payloads
- analytics or evaluation records
- any state-changing or machine-consumed downstream logic

Structured-output contracts are strongly recommended for:

- advisory recommendations that may later become actions
- human review interfaces that need deterministic rendering
- reusable intelligence artifacts intended for storage

Free-form responses remain acceptable for:

- conversational explanation
- brainstorming surfaces
- narrative justification
- human-facing summaries
- exploratory ideation that is not machine-consumed directly

---

# 11. Required Characteristics

The structured-output system shall provide or support the following characteristics.

## 11.1 Explicit Schemas
Each important machine-consumed output class should have a defined schema or typed contract.

## 11.2 Validation Before Use
No machine-consumed AI output should be trusted without validation against the expected contract.

## 11.3 Retry or Regeneration Strategy
If validation fails, the system should support controlled retry, regeneration, fallback, or escalation behavior.

## 11.4 Contract Versioning
Important output schemas should be versionable so downstream systems can evolve safely.

## 11.5 Separation of Payload and Explanation
Where useful, machine-readable output and human-readable explanation should be generated as separate fields or separate artifacts rather than mixed together.

## 11.6 Provider-Neutral Internal Meaning
Internal consumers should depend on internal contracts rather than provider-specific formatting patterns.

## 11.7 Safe Failure Handling
If output validation repeatedly fails, the system should stop unsafe automation and escalate rather than guessing.

## 11.8 Testability
Schemas and validators should be testable independently from model behavior.

## 11.9 Observability
Invalid output rates, retry rates, schema version usage, and downstream contract failures should be measurable.

---

# 12. Architecture Rules

1. Any AI output that drives software logic shall use a defined contract.
2. Validation shall occur before downstream execution or persistence.
3. Free-text parsing shall not be used as the default mechanism for machine-critical behavior.
4. Contracts shall be owned by the consuming domain, not left implicit in prompts alone.
5. Important contracts should be versioned explicitly.
6. Downstream systems should consume typed internal objects, not raw model text.
7. Human-readable explanation should not be relied upon as the machine contract.
8. Fallback behavior must be defined for invalid or partial outputs.
9. Schema design should minimize ambiguity and avoid overloading fields with mixed meaning.

---

# 13. Prohibited Patterns

The following patterns are prohibited unless a future accepted ADR explicitly authorizes them:

- parsing critical operational meaning from unconstrained prose
- regex-based extraction as the primary contract for important workflows
- hidden schema assumptions existing only inside prompt wording
- direct execution from raw model text
- storing malformed output as accepted operational state
- mixing explanation text and machine payload in an inseparable format
- silently dropping invalid fields and proceeding as if output were valid
- downstream modules guessing missing required fields
- provider-specific raw response parsing inside business modules

---

# 14. Implementation Implications

- architecture implication: AI interfaces must distinguish human-facing responses from machine-facing outputs
- backend implication: validators and schema-aware adapters become first-class integration components
- workflow implication: workflow transitions should depend on validated objects, not raw text
- provider implication: model adapters should support schema-constrained or schema-validated generation paths
- observability implication: invalid-output telemetry should be captured centrally
- data implication: stored AI-generated objects should preserve schema version and validation status where appropriate
- security implication: malformed outputs should not bypass policy gates
- testing implication: contract fixtures and negative-case validation tests are required
- UI implication: review interfaces may need both explanation and structured payload visibility
- refactoring implication: output contracts must be governed like API contracts, not treated as ad hoc prompt artifacts

---

# 15. Validation Strategy

This ADR should be validated through:

- contract test coverage for key AI output classes
- schema validation success-rate monitoring
- retry-rate monitoring
- review of workflow incidents caused by invalid AI payloads
- codebase review for raw free-text parsing in machine-critical paths
- provider adapter conformance checks
- backward-compatibility review for schema evolution
- operator review of explanation and payload clarity where approvals are required

## Review Trigger

This ADR should be revisited if schema-driven outputs become impractical for key workloads or if contract overhead becomes disproportionate to platform value.

## Re-evaluation Conditions

Re-evaluate this ADR if:

- the platform adopts a different AI-runtime contract model
- multimodal outputs require materially different validation patterns
- a major class of business-critical outputs cannot be represented effectively through current contract approaches
- schema governance becomes a bottleneck to delivery
- provider-native structured outputs become insufficient for platform needs

---

# 16. Final Rule

`apexcore` shall use explicit structured output contracts for consequential AI outputs unless a future accepted ADR explicitly authorizes a tightly scoped exception.
