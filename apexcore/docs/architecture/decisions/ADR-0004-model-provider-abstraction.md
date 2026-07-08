# ADR-0004-model-provider-abstraction

**Status:** Accepted  
**Date:** 2026-07-08  
**Owners:** Chief AI Architect, Platform Architecture Lead  
**Reviewers:** Backend Architecture Lead, AI Platform Lead, Security Architecture Lead, Engineering Leadership  
**Supersedes:**  
**Superseded By:**  
**Related Documents:**  
- `apexcore/docs/architecture/README.md`
- `apexcore/docs/architecture/volume-1-part-2.md`
- `apexcore/docs/architecture/decisions/ADR-0001-architecture-principles.md`
- `apexcore/docs/architecture/decisions/ADR-0003-governed-autonomy-model.md`
- `apexcore/docs/architecture/decisions/adr-template.md`

---

# 1. Title

Adopt a model-provider abstraction layer for all LLM and AI-model interactions within `apexcore`.

---

# 2. Status

Accepted

---

# 3. Context

SkyBazz APEX is being designed as an enterprise Autonomous Growth Intelligence Platform with long-term ambitions across:

- growth intelligence
- market intelligence
- customer intelligence
- forecasting
- planning
- orchestration
- knowledge workflows
- agentic reasoning
- analytics support
- governed execution

This platform will require multiple forms of AI capability over time, such as:

- reasoning
- summarization
- extraction
- classification
- planning assistance
- tool selection support
- content generation
- structured transformation
- ranking
- semantic retrieval support
- evaluation

Different model providers are likely to perform differently across these workloads.

They may also differ in:

- cost
- latency
- context limits
- output quality
- tool-calling support
- response formats
- availability
- regional deployment options
- security posture
- compliance suitability
- pricing changes
- roadmap stability

If `apexcore` integrates directly with specific provider SDKs or API schemas throughout the codebase, the platform will accumulate vendor coupling quickly.

That would create several problems:

- high switching cost
- repeated provider-specific code
- inconsistent prompt handling
- inconsistent retry behavior
- fragmented logging
- fragmented policy enforcement
- difficult benchmarking
- weak failover capability
- reduced negotiating leverage with vendors
- architectural drag on future platform growth

Because replaceable model providers are a stated architectural goal, provider abstraction must be treated as a first-class architectural decision rather than a convenience wrapper.

---

# 4. Decision

`apexcore` shall adopt a **model-provider abstraction layer** for all LLM and AI-model interactions.

Application modules, domain services, workflows, and agents shall not call model-vendor APIs directly.

Instead, all model interactions shall pass through a controlled internal abstraction boundary.

The abstraction layer shall provide:

- a provider-neutral request contract
- a provider-neutral response contract where feasible
- model capability metadata
- routing support
- policy enforcement hooks
- retry and timeout standardization
- observability and usage logging
- failover and fallback support
- versionable prompt and instruction handling
- structured-output support where required

This abstraction layer may be implemented as an internal service, gateway module, platform SDK, or equivalent controlled interface.

The implementation form may evolve, but the abstraction boundary itself is mandatory.

---

# 5. Decision Drivers

- vendor independence
- reduced switching cost
- replaceable AI providers
- centralized observability
- centralized policy enforcement
- multi-model routing support
- better resilience to provider outages
- support for workload-specific model selection
- easier benchmarking and evaluation
- consistent integration patterns across the platform

---

# 6. Alternatives Considered

## Alternative A — Direct provider integration in each module

### Description
Allow each module, workflow, or agent to integrate directly with the provider it needs.

### Why It Was Considered
This is often the fastest short-term path and may reduce initial platform work.

### Why It Was Not Chosen
This creates vendor coupling throughout the codebase, duplicates error handling, makes policy inconsistent, complicates migration, and weakens observability.

## Alternative B — Standardize on one provider only

### Description
Choose one primary model provider and commit the whole platform to that provider’s API model and feature set.

### Why It Was Considered
This simplifies implementation and reduces early architectural complexity.

### Why It Was Not Chosen
This creates strategic lock-in, reduces bargaining leverage, and assumes one provider will remain best across all workloads, price points, and regulatory needs.

## Alternative C — Use a third-party gateway as the core abstraction

### Description
Delegate abstraction and routing responsibilities entirely to an external gateway platform.

### Why It Was Considered
This may accelerate implementation and reduce internal engineering effort.

### Why It Was Not Chosen
This can still shift lock-in to another layer, may limit custom governance needs, and may not satisfy long-term control requirements for prompts, routing, analytics, and policy.

## Chosen Alternative — Internal provider abstraction boundary with optional gateway support

### Description
Create a controlled internal abstraction layer owned by SkyBazz APEX, optionally backed by gateway tooling where useful.

### Why It Was Chosen
This preserves strategic control while still allowing flexible infrastructure choices underneath the abstraction.

---

# 7. Rationale

Model providers are infrastructure dependencies, not the business architecture.

The business value of SkyBazz APEX will come from:

- orchestration logic
- knowledge design
- memory behavior
- decision quality
- policy enforcement
- workflow intelligence
- analytics and evaluation
- user trust
- domain-specific operating logic

If model-provider details leak into these layers, the platform becomes harder to evolve.

The abstraction layer protects the core architecture by ensuring that application logic depends on an internal interface rather than a vendor-specific contract.

This also makes it possible to support a **multi-model strategy**.

Different workloads may legitimately require different model choices.

Examples include:

- fast low-cost models for routine transformations
- higher-capability models for reasoning-heavy tasks
- region-specific models for data residency needs
- private deployment models for sensitive workloads
- specialized models for extraction or classification

A provider abstraction layer allows these choices to be made centrally and changed over time.

It also provides a clean place to standardize:

- retries
- timeouts
- circuit breaking
- response normalization
- structured output validation
- token accounting
- cost attribution
- prompt versioning
- safety policy hooks
- redaction or data-handling rules

Without this layer, every team would solve these problems differently.

---

# 8. Architecture Rules

1. `apexcore` shall access language and reasoning models through a provider abstraction rather than direct provider-specific integration in business flows.
2. Provider-specific behavior shall be encapsulated behind governed interfaces.
3. Model invocation policies, observability, and fallback behavior shall be implemented at the abstraction layer.
4. Switching or adding providers shall not require redesign of business workflows.
5. Provider credentials and operational controls shall remain separate from domain logic.

# 9. Consequences

## Positive Consequences

- Model provider changes become easier to manage.
- Operational controls can be applied consistently across providers.
- Platform portability and resilience improve.

## Negative Consequences

- The abstraction layer adds design and maintenance overhead.
- Some provider-specific features may be slower to expose.
- Teams must manage compatibility across different model behaviors.

## Neutral or Operational Consequences

- Provider evaluation becomes a platform concern rather than an application concern.
- Testing must cover abstraction behavior as well as provider behavior.
- Operational metrics should be collected at the abstraction boundary.

# 10. Scope of Abstraction

The abstraction layer shall govern:

- LLM text-generation calls
- structured-response generation
- tool-capable model calls
- classification and extraction requests where model-based
- summarization requests
- ranking or reasoning requests
- model metadata access
- token and cost accounting
- model routing decisions
- failure and fallback behaviors

It may also later govern:

- embedding models
- multimodal model requests
- speech and voice models
- fine-tuned internal models
- evaluation models
- safety or moderation models

If some of these categories require separate internal interfaces, they should still conform to the provider-abstraction principle.

---

# 11. Required Characteristics

The abstraction layer should provide or support the following characteristics.

## 11.1 Provider-Neutral Request Contract
Calling systems should express intent in internal terms rather than provider-specific payload shapes.

## 11.2 Capability Metadata
The platform should track which models support which features, such as structured output, long context, tool invocation, or regional deployment suitability.

## 11.3 Routing Support
Requests may be routed by workload class, policy, latency requirement, cost envelope, sensitivity class, or fallback need.

## 11.4 Standardized Reliability Behavior
Retries, backoff, timeouts, circuit breaking, and fallback should be standardized rather than reimplemented everywhere.

## 11.5 Policy Hooks
Sensitive data handling, approval dependencies, redaction requirements, and environment restrictions should be enforceable around model calls.

## 11.6 Observability
The platform should record request class, model selection, latency, failures, usage volume, token metrics where available, and cost attribution.

## 11.7 Structured Output Support
Where downstream logic depends on machine-readable outputs, the abstraction should support schema-aware or validation-aware response handling.

## 11.8 Versioned Prompt Handling
Prompt templates, instructions, and system-behavior configurations should be versionable and separable from core business logic.

## 11.9 Controlled Extension Points
Provider-specific capabilities may be used only through explicit extension mechanisms rather than informal leakage across the codebase.

---

# 12. Prohibited Patterns

The following patterns are prohibited unless a future accepted ADR explicitly allows them:

- direct vendor SDK usage inside domain modules
- business logic dependent on raw provider response wording
- prompts embedded diffusely across unrelated code paths without version control
- provider-specific retry logic duplicated across modules
- model selection hardcoded into domain logic without abstraction
- storage of critical state only inside provider-managed conversational memory
- unlogged model invocations for production workflows
- bypassing the abstraction layer for convenience in permanent code
- assuming one provider’s feature set defines the platform contract

---

# 13. Implementation Implications

- architecture implication: provider APIs should terminate behind an internal boundary
- backend implication: modules should request capabilities, not vendors
- workflow implication: workflows should specify workload intent and constraints, not provider payload details
- observability implication: model usage telemetry should be centralized
- security implication: data handling rules should be enforceable before requests leave the platform
- testing implication: contract tests should validate provider adapters against internal expectations
- evaluation implication: providers should be benchmarkable using common workloads and metrics
- cost implication: usage accounting should be attributed by workload, tenant, and feature where possible
- refactoring implication: provider replacement should primarily affect adapters and routing policy rather than business modules

---

# 14. Architecture Rules

1. Domain services may depend only on internal model interfaces, not vendor SDKs.
2. Provider-specific adapters shall remain outside domain logic.
3. Routing policy shall be centralized or governed, not scattered across modules.
4. Prompt templates and instruction assets should be managed as versioned configuration or controlled assets.
5. Structured outputs should be preferred where downstream automation depends on response interpretation.
6. The abstraction layer shall be observable, testable, and policy-aware.
7. Fallback or failover paths should be designed for critical workloads where justified.
8. Internal state and memory shall remain controlled by SkyBazz APEX rather than delegated to opaque vendor-managed session memory.

---

# 15. Validation

The success of this decision should be evaluated through:

- absence of direct provider SDK leakage in domain modules
- ability to add or change providers with limited code impact
- consistency of model-call telemetry
- centralized cost and usage reporting
- benchmarkability across multiple models
- reduction of duplicated provider-specific integration logic
- policy enforcement coverage at the abstraction boundary
- successful fallback or failover behavior in controlled testing

## Review Trigger

This ADR should be revisited if the abstraction layer becomes too weak to prevent provider leakage or too rigid to support necessary model capabilities.

## Re-evaluation Conditions

Re-evaluate this ADR if:

- the platform standardizes on internal models only
- a future architecture introduces a more general AI capability fabric
- the abstraction creates unacceptable performance or feature constraints
- multimodal workloads require a fundamentally different interface model
- provider-specific capabilities become central to business differentiation

---

# 16. Final Rule

`apexcore` shall use a governed model provider abstraction for consequential model interactions unless a future accepted ADR explicitly authorizes a tightly scoped exception.
