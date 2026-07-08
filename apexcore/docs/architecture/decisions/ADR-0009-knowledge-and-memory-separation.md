# ADR-0009-knowledge-and-memory-separation

**Status:** Accepted  
**Date:** 2026-07-08  
**Owners:** Chief AI Architect, Platform Architecture Lead  
**Reviewers:** Backend Architecture Lead, AI Platform Lead, Data Governance Lead, Security Architecture Lead, Engineering Leadership  
**Supersedes:**  
**Superseded By:**  
**Related Documents:**  
- `apexcore/docs/architecture/README.md`
- `apexcore/docs/architecture/volume-1-part-2.md`
- `apexcore/docs/architecture/decisions/ADR-0001-architecture-principles.md`
- `apexcore/docs/architecture/decisions/ADR-0008-memory-governance-and-recall-boundaries.md`
- `apexcore/docs/architecture/decisions/adr-template.md`

---

# 1. Title

Separate governed memory from authoritative knowledge in `apexcore`.

---

# 2. Status

Accepted

---

# 3. Context

SkyBazz APEX is intended to become an enterprise Autonomous Growth Intelligence Platform that can remember prior context, recall useful experiences, and use business information to generate recommendations and governed actions.

That requires both:

- memory
- knowledge

These are related, but they are not the same thing.

Memory helps the platform preserve prior context, interactions, outcomes, preferences, and notable events.

Knowledge provides durable, authoritative, governed understanding of business facts, definitions, entities, policies, and approved operational understanding.

If the platform treats memory and knowledge as interchangeable, several failure modes emerge:

- remembered experiences may be treated as authoritative truth
- outdated observations may override current approved business facts
- agent-learned artifacts may become canonical without review
- semantically retrieved content may be used without provenance
- operator convenience may bypass formal business ownership
- conflicting records may appear equally valid
- downstream systems may receive recommendations based on unverified memory
- policy and procedural guidance may be mutated by incidental interactions

This risk increases as the platform gains more autonomy.

A recommendation engine may tolerate some ambiguity.

A governed execution platform may not.

The architecture therefore needs a formal rule that distinguishes:

- what the platform remembers
- what the platform knows
- what sources are authoritative
- how non-authoritative learning can be promoted into authoritative knowledge

---

# 4. Decision

`apexcore` shall maintain a strict architectural separation between **governed memory** and **authoritative knowledge**.

Memory shall represent retained context, experiences, prior outcomes, preferences, and other recallable artifacts that may be useful for continuity, personalization, or learning.

Knowledge shall represent governed, source-attributed, ownership-attributed, and operationally authoritative information that the platform may rely on as a business truth source.

The platform shall not treat all recalled information as equally trustworthy.

Instead:

- memory is recallable context
- knowledge is authoritative reference
- promotion from memory-derived artifacts into knowledge requires governance
- retrieval must preserve domain distinction and provenance

This separation shall apply to storage design, retrieval design, write behavior, trust behavior, and explanation behavior.

---

# 5. Decision Drivers

- prevent conflation of memory with truth
- preserve authoritative business sources
- improve recommendation quality
- reduce stale or low-confidence recall risk
- support source provenance and ownership
- enable governed promotion of learned artifacts
- maintain trust in enterprise outputs
- protect policy and procedural knowledge
- support correction and lifecycle governance
- reduce architectural ambiguity

---

# 6. Definitions

## 6.1 Memory

Memory is retained contextual material that helps the platform remember prior interactions, events, outcomes, preferences, and experiences.

Memory may be:

- transient
- session-scoped
- event-based
- learned from use
- partially structured
- confidence-graded
- subject to selective recall

Memory is useful.

Memory is not automatically authoritative.

## 6.2 Knowledge

Knowledge is a governed representation of durable business understanding.

Knowledge should have, where relevant:

- identifiable source provenance
- ownership
- stewardship
- review path
- correction path
- versioning or effective-date semantics
- trust expectations appropriate to its business use

Knowledge may include:

- approved business definitions
- product facts
- customer segment definitions
- official process guidance
- approved strategic rules
- curated market facts
- connector and system capability facts
- formal operating constraints

## 6.3 Authoritative Knowledge Source

An authoritative knowledge source is a designated source of truth for a defined knowledge domain.

Examples may include:

- approved business registries
- governed knowledge repositories
- policy systems
- approved operational documentation
- product catalog systems
- CRM or master-data sources where formally designated
- governed research repositories where formally designated

Authoritativeness is a governance property, not a storage format.

---

# 7. Alternatives Considered

## Alternative A — Treat semantic memory as the knowledge layer

### Description
Use one retrieval-oriented system for both memory and knowledge, relying on ranking and semantic similarity to surface useful results.

### Why It Was Considered
This simplifies the architecture and may accelerate prototyping.

### Why It Was Not Chosen
Semantic similarity is not a governance model. It cannot by itself guarantee provenance, ownership, freshness, or authoritativeness.

## Alternative B — Store knowledge and memory together but tag them differently

### Description
Keep memory and knowledge in one shared substrate with metadata tags.

### Why It Was Considered
This appears simpler operationally and preserves retrieval convenience.

### Why It Was Not Chosen
A shared substrate can still encourage conflation in recall behavior, write behavior, and downstream trust assumptions unless architectural rules remain explicit and enforceable.

## Alternative C — Avoid memory and rely only on formal knowledge sources

### Description
Permit only approved business knowledge and disallow durable memory-like recall beyond current session context.

### Why It Was Considered
This reduces trust ambiguity.

### Why It Was Not Chosen
The platform would lose important continuity, learning, personalization, and experience-based improvement capabilities.

## Chosen Alternative — Separate memory from authoritative knowledge

### Description
Retain both capabilities but give them different semantics, trust levels, ownership expectations, and governance paths.

### Why It Was Chosen
This best supports learning and continuity without compromising enterprise truth management.

---

# 8. Architecture Rules

1. `apexcore` shall preserve a strict architectural distinction between governed memory and authoritative knowledge.
2. Retrieval logic shall preserve whether recalled material came from memory or knowledge.
3. Memory-derived material shall not be treated as authoritative truth by default.
4. Promotion from memory-derived material into authoritative knowledge shall require governance.
5. Knowledge used in consequential flows shall preserve source, ownership, and trust context where relevant.

# 9. Consequences

## Positive Consequences

- The platform can differentiate useful context from approved business truth.
- Retrieval and explanation quality improve because provenance is preserved.
- Authoritative knowledge is better protected from accidental drift.

## Negative Consequences

- Storage and retrieval design become more complex.
- Promotion workflows require review and stewardship effort.
- Teams must model provenance and ownership more carefully.

## Neutral or Operational Consequences

- Some domains will use both memory and knowledge together with explicit trust handling.
- Governance processes must define authoritative sources per domain.
- Evaluation should separately measure memory usefulness and knowledge correctness.

# 10. Trust Model

The platform shall apply differentiated trust semantics.

## 10.1 Memory Trust Characteristics

Memory may be:

- useful
- recent
- relevant
- personalized
- confidence-scored
- experience-derived

Memory may also be:

- incomplete
- stale
- anecdotal
- noisy
- low-confidence
- domain-limited

Therefore memory informs, but does not automatically authorize.

## 10.2 Knowledge Trust Characteristics

Knowledge should be:

- source-attributed
- ownership-attributed
- reviewable
- correctable
- lifecycle-governed
- suitable for use as approved business reference where designated

Knowledge may still become outdated, but its governance path is explicit.

## 10.3 Consequential Use Rule

For consequential decisions and actions, authoritative knowledge should take precedence over memory where the two conflict, unless a future accepted ADR explicitly defines a safe exception model.

---

# 11. Promotion Rules

Not all learning should become knowledge.

Promotion from memory-derived material into authoritative knowledge shall require a governance path appropriate to the domain.

A promotion path may involve:

- source validation
- human review
- steward approval
- conflict detection
- effective-date handling
- versioning
- correction workflows
- provenance capture

Until promoted through an approved path, memory-derived artifacts remain non-authoritative.

---

# 12. Retrieval and Explanation Rules

The retrieval layer should support at least these distinctions:

- retrieved from memory
- retrieved from authoritative knowledge
- synthesized from multiple sources
- confidence or trust level where applicable
- freshness or timestamp where applicable
- source or owner attribution where applicable

Where consequential recommendations or actions are produced, the platform should be able to explain whether the output was based on:

- prior experience
- approved business knowledge
- current operational data
- policy or procedure knowledge
- a combination of the above

This does not require exposing hidden internal reasoning text.

It requires preserving meaningful provenance and trust signals.

---

# 13. Prohibited Patterns

The following patterns are prohibited unless a future accepted ADR explicitly authorizes them:

- treating semantically recalled memory as a source of truth by default
- allowing agents to write directly into authoritative knowledge without governance
- using memory recall to override current policy or approved procedure silently
- merging memory and knowledge into one trust-undifferentiated recall path
- presenting memory-derived statements as official business facts without attribution
- mutating policy or procedural knowledge through incidental interaction histories
- suppressing source provenance in consequential outputs
- assuming a high-similarity retrieval result is authoritative

---

# 14. Consequences

## Positive Consequences

- trust in recommendations improves
- authoritative sources remain protected
- learning can continue without corrupting business truth
- explanations become clearer
- governance of knowledge becomes more practical
- stale-memory risk is reduced
- policy and procedure integrity improve
- platform architecture becomes easier to reason about

## Negative Consequences

- retrieval and storage design become more complex
- teams must model provenance and ownership more carefully
- promotion workflows require governance effort
- some fast-moving learnings may remain non-authoritative longer
- implementation may require multiple data pathways

## Neutral or Operational Consequences

- some domains may reference both memory and knowledge together
- conflicts between experience and authority will require explicit handling
- stewardship roles for knowledge domains may need to be formalized

---

# 15. Trade-Offs

- Benefit accepted: stronger truth management and safer enterprise behavior
- Cost accepted: more architectural separation and governance work
- Complexity accepted: provenance, stewardship, and promotion pathways
- Speed sacrificed: casual direct promotion of learned artifacts
- Risk reduced: authoritative drift, stale knowledge use, and conflation of experience with truth

---

# 16. Final Rule

`apexcore` shall preserve a strict separation between governed memory and authoritative knowledge unless a future accepted ADR explicitly authorizes a tightly scoped exception.
