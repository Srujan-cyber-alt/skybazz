
# ADR-0015-evaluation-quality-thresholds-and-continuous-validation

**Status:** Accepted  
**Date:** 2026-07-08  
**Owners:** Chief AI Architect, AI Platform Lead  
**Reviewers:** Platform Architecture Lead, SRE Lead, Security Architecture Lead, Data Governance Lead, Engineering Leadership  
**Supersedes:**  
**Superseded By:**  
**Related Documents:**  
- `apexcore/docs/architecture/README.md`
- `apexcore/docs/architecture/volume-1-part-2.md`
- `apexcore/docs/architecture/decisions/ADR-0006-policy-enforcement-before-execution.md`
- `apexcore/docs/architecture/decisions/ADR-0011-environment-and-release-gating-for-autonomous-actions.md`
- `apexcore/docs/architecture/decisions/ADR-0014-observability-slos-and-operational-readiness.md`
- `apexcore/docs/architecture/decisions/adr-template.md`

---

# 1. Title

Adopt evaluation quality thresholds and continuous validation requirements for `apexcore`.

---

# 2. Status

Accepted

---

# 3. Context

SkyBazz APEX is being designed as an Autonomous Growth Intelligence Platform that will reason, retrieve context, invoke tools, orchestrate workflows, generate recommendations, and in some cases execute governed actions.

For such systems, conventional software testing is necessary but insufficient.

A capability may:

- pass unit tests but fail at real task completion
- produce fluent responses while making poor decisions
- choose the wrong tool while appearing confident
- degrade after prompt, model, policy, or connector changes
- behave well in staging but poorly in production distribution
- remain technically available while quality decays
- pass average metrics while failing important edge cases
- regress silently after a release or dependency change

This is especially true for systems using models, retrieval, memory, tools, policies, and workflow orchestration together.

Without a formal evaluation architecture, the platform risks:

- shipping capabilities with unclear success criteria
- relying on subjective judgments of quality
- missing regressions between versions
- using incomplete test sets that ignore edge cases
- over-trusting a single evaluation method
- weak release gates for autonomy quality
- poor calibration between automated and human review
- delayed detection of quality drift in production
- inability to compare alternative models, prompts, or tool strategies fairly

Enterprise AI evaluation guidance increasingly emphasizes repeatable scorecards, explicit thresholds, multi-method assessment, regression gates, CI/CD integration, synthetic and scenario-based tests, and continuous production monitoring.

SkyBazz APEX therefore requires an architecture decision that makes quality measurable, reviewable, and enforceable over time.

---

# 4. Decision

`apexcore` shall adopt **explicit evaluation quality thresholds and continuous validation requirements** for consequential AI capabilities, workflows, and autonomy features.

Evaluation shall be treated as a lifecycle control, not a one-time pre-release activity.

Consequential capabilities shall define:

- what quality means
- how quality is measured
- what thresholds are acceptable
- which tests are gating
- how regressions are detected
- how human review calibrates automation
- how production validation continues after release

Capabilities shall not be considered production-ready solely because they appear subjectively good or pass limited demonstrations.

Where risk justifies it, release and rollout decisions shall depend on evaluation evidence and threshold compliance.

---

# 5. Decision Drivers

- need for measurable AI quality standards
- prevention of silent regressions
- safe rollout of autonomy features
- stronger release discipline
- support for multi-step task evaluation
- validation of tool-use quality
- calibration of automated and human assessment
- continuous detection of quality drift
- comparability across versions and strategies
- stronger governance for consequential capabilities

---

# 6. Definitions

## 6.1 Evaluation

A structured process for measuring capability quality, reliability, safety, and task effectiveness using defined methods and criteria.

## 6.2 Quality Threshold

A predefined minimum acceptable value, range, or score for a metric or scorecard dimension.

## 6.3 Regression Gate

A release or promotion control that blocks rollout when evaluation results worsen beyond allowed tolerance.

## 6.4 Continuous Validation

Ongoing assessment of capability behavior after release using production signals, sampled review, or other repeatable checks.

## 6.5 Consequential Capability

A workflow, agent, or action surface whose outputs, recommendations, or actions can materially affect business outcomes, external systems, user trust, or operational workload.

---

# 7. Alternatives Considered

## Alternative A — Rely on informal demos and expert judgment

### Description
Evaluate quality through ad hoc reviews, spot checks, and stakeholder confidence.

### Why It Was Considered
It is fast and low-overhead for early prototypes.

### Why It Was Not Chosen
It is inconsistent, hard to compare over time, and too weak for consequential production capabilities.

## Alternative B — Use a single evaluation metric

### Description
Choose one headline number such as accuracy or task success and use it as the primary quality gate.

### Why It Was Considered
It simplifies decision-making.

### Why It Was Not Chosen
AI capability quality is multi-dimensional. One number hides important failure modes such as tool misuse, safety issues, latency, or poor edge-case behavior.

## Alternative C — Evaluate only before release

### Description
Run offline tests before deployment and treat production as an operational monitoring problem rather than an evaluation problem.

### Why It Was Considered
This follows a more traditional software delivery model.

### Why It Was Not Chosen
Production distributions, user behavior, and dependency changes can expose quality issues that pre-release tests miss.

## Chosen Alternative — Threshold-based lifecycle evaluation with continuous validation

### Description
Define explicit scorecards and thresholds, use gating and regression checks, and continue validating behavior after release.

### Why It Was Chosen
This best supports measurable quality, safer releases, and long-term confidence in autonomous behavior.

---

# 8. Architecture Rules

1. `apexcore` shall define evaluation thresholds for consequential AI and automation capabilities before broad release.
2. Quality thresholds shall reflect the risk and business importance of each capability.
3. Continuous validation shall be used to detect quality regressions over time.
4. Features that fail required thresholds shall be blocked, limited, or reviewed before continued use.
5. Evaluation methods and datasets shall be governed and periodically reviewed for relevance.

# 9. Consequences

## Positive Consequences

- Quality expectations become explicit and measurable.
- Regressions can be detected earlier.
- Release decisions become more evidence-based.

## Negative Consequences

- Evaluation design and maintenance require ongoing investment.
- Threshold disputes may arise when product pressure conflicts with quality gates.
- Poor evaluation design may create false confidence if not regularly reviewed.

## Neutral or Operational Consequences

- Teams must maintain test cases, datasets, and benchmark procedures.
- Evaluation results should feed release and incident review processes.
- Continuous validation infrastructure becomes part of platform operations.

# 10. Metric and Scorecard Rules

Evaluation should use a scorecard rather than a single metric wherever quality is multi-dimensional.

Possible scorecard dimensions include:

- task completion rate
- partial success rate
- recommendation quality
- tool selection accuracy
- tool argument validity
- safety or policy violation rate
- escalation appropriateness
- factual grounding or support quality
- latency
- cost per successful task
- reversal or correction rate
- operator intervention rate

Teams should define which dimensions are gating, advisory, or diagnostic.

---

# 11. Threshold Rules

Consequential capabilities shall define explicit quality thresholds before broad production rollout.

Thresholds should specify at least:

- the metric or scorecard dimension
- the minimum acceptable level
- whether failure blocks release or rollout
- the evaluation dataset or scenario basis
- the review cadence

Thresholds should be proportionate to business risk.

High-risk capabilities should have stricter thresholds and stronger release consequences.

---

# 12. Evaluation Method Rules

Evaluation should not rely on a single method when risk or complexity is meaningful.

Methods may include:

- deterministic checks
- scenario-based test suites
- offline replay
- synthetic or generated test cases
- red-team or adversarial testing
- judge-model or rubric-based assessment
- human review
- side-by-side version comparison
- production sampling and review

Where automated judging is used, teams should calibrate it periodically against human review for important dimensions.

---

# 13. Regression Gate Rules

Releases, prompt changes, model changes, policy changes, and tool-orchestration changes should be evaluated for regression risk.

Regression gates should support:

- baseline comparison against prior accepted versions
- threshold enforcement
- tolerance bands where appropriate
- detection of edge-case degradation
- release pause or rollback decisions where needed

No consequential capability should rely solely on anecdotal release confidence when regression evidence is available.

---

# 14. Continuous Validation Rules

Evaluation does not end at release.

Consequential production capabilities should support ongoing validation through one or more of:

- production sampling
- drift detection
- human spot review
- outcome-based business metrics
- correction or reversal monitoring
- intervention-rate monitoring
- canary or shadow comparisons
- periodic replay against benchmark sets

Production validation should be linked to observability and operational review rather than treated as a separate silo.

---

# 15. Human Review Rules

Human review should be used where it adds calibration, governance, or edge-case confidence.

Human review may be appropriate for:

- high-risk outputs
- ambiguous evaluation dimensions
- judge-model calibration
- disputed regression outcomes
- low-frequency high-impact scenarios
- policy-sensitive behaviors

Human review does not eliminate the need for automation.

Automation does not eliminate the need for human calibration.

---

# 16. Final Rule

`apexcore` shall use explicit evaluation thresholds and continuous validation for consequential AI and automation capabilities unless a future accepted ADR explicitly authorizes a tightly scoped exception.
