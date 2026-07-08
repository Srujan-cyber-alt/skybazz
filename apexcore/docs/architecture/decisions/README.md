# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for `apexcore`.

ADRs capture significant architectural decisions, their context, and their consequences.
These records are intended to be lightweight, reviewable, and easy to find in the source repository.

## Status model

- **Proposed** — drafted and under review
- **Accepted** — approved and active
- **Superseded** — replaced by a newer ADR
- **Rejected** — considered but not adopted

## Working rules

- One ADR per significant decision.
- Keep ADRs in Markdown.
- Use monotonic numbering in filenames.
- Treat accepted ADRs as append-only records.
- If a decision changes, create a new ADR that supersedes the old one.

## ADR log

| ADR | Title | Status |
|---|---|---|
| ADR-0001 | architecture principles | Accepted |
| ADR-0002 | bounded context strategy | Accepted |
| ADR-0003 | governed autonomy model | Accepted |
| ADR-0004 | model provider abstraction | Accepted |
| ADR-0005 | structured output contracts | Accepted |
| ADR-0006 | policy enforcement before execution | Accepted |
| ADR-0007 | decision and action traceability | Accepted |
| ADR-0008 | memory governance and recall boundaries | Accepted |
| ADR-0009 | knowledge and memory separation | Accepted |
| ADR-0010 | human approval and delegated authority model | Superseded |
| ADR-0011 | environment and release gating for autonomous actions | Accepted |
| ADR-0012 | tool and connector capability registry | Accepted |
| ADR-0013 | failure handling compensation and safe fallbacks | Accepted |
| ADR-0014 | observability slos and operational readiness | Accepted |
| ADR-0015 | evaluation quality thresholds and continuous validation | Accepted |
| ADR-0016 | data lineage provenance and evidence retention | Accepted |
| ADR-0017 | access control secrets and credential brokering | Accepted |
| ADR-0018 | tenant isolation boundaries and cross tenant safeguards | Accepted |
| ADR-0019 | rate limits quotas and abuse protection | Accepted |
| ADR-0020 | model selection versioning and change management | Accepted |
| ADR-0021 | human feedback corrections and learning boundaries | Accepted |
| ADR-0022 | retention deletion and right to remove controls | Accepted |
| ADR-0023 | incident response escalation and kill switch controls | Accepted |
| ADR-0024 | domain ownership stewardship and accountability model | Accepted |
| ADR-0025 | architecture conformance review and exception management | Accepted |
| ADR-0026 | event schema versioning | Accepted |
| ADR-0027 | business continuity and disaster recovery governance | Accepted |
| ADR-0028 | third party dependency and vendor risk governance | Accepted |

## Review expectations

Each ADR should clearly state:

- the decision
- the context
- the alternatives considered
- the consequences and trade-offs
- ownership and review responsibility where relevant

## Usage

When adding a new ADR:

1. Copy the project ADR template.
2. Assign the next sequential number.
3. Open in **Proposed** status during review.
4. Mark as **Accepted** only after approval.
5. Update this `README.md` log.
