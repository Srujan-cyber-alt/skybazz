#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ADR_DIR = Path("./docs/architecture/decisions")

FINAL_RULE_UPDATES = {
    "ADR-0008-memory-governance-and-recall-boundaries.md": """# 16. Final Rule

`apexcore` shall maintain governed memory boundaries and recall controls so that retained experience supports continuity and learning without bypassing policy, provenance, or authoritative knowledge sources unless a future accepted ADR explicitly supersedes or narrows these controls.""",
    "ADR-0021-human-feedback-corrections-and-learning-boundaries.md": """# 16. Final Rule

`apexcore` shall govern human feedback, corrections, and learning boundaries so that human input improves the platform without bypassing provenance, policy, or authoritative knowledge controls unless a future accepted ADR explicitly supersedes or narrows these controls.""",
}

SECTION_TEMPLATES_7_TO_15 = {
    7: """# 7. Alternatives Considered

## Alternative A — Minimal governance

### Description
Keep the capability lightweight with fewer formal controls.

### Why It Was Considered
This can reduce delivery overhead and accelerate early implementation.

### Why It Was Not Chosen
It provides insufficient control, traceability, or consistency for consequential platform use.

## Alternative B — Full centralization

### Description
Place all related responsibilities into a single heavily centralized control model.

### Why It Was Considered
This can improve consistency and simplify some governance decisions.

### Why It Was Not Chosen
It can create bottlenecks, reduce domain autonomy, and slow platform evolution.

## Chosen Alternative — Governed, explicit architecture

### Description
Use an explicit, reviewable approach with clear rules, consequences, and enduring guidance.

### Why It Was Chosen
This best balances platform safety, clarity, governance, and long-term evolvability.""",

    10: """# 10. Trust Model

The trust model for this ADR follows the principle that consequential platform behavior should rely on explicit governance, traceable inputs, and reviewable controls.

Trust in this area should increase when:

- rules are explicit
- responsibilities are defined
- changes are reviewable
- exceptions are governed
- decisions are traceable

Trust should decrease when behavior is ambiguous, undocumented, weakly governed, or difficult to review.

Where this ADR affects consequential workflows, approved architectural controls should take precedence over implicit assumptions or ad hoc implementation behavior.""",

    11: """# 11. Promotion Rules

Changes related to this ADR should not become durable platform standards through accidental reuse or informal convention alone.

Promotion into broader architectural practice should require, as appropriate:

- review by the relevant architecture owner
- consistency with accepted ADRs
- validation against platform governance expectations
- identification of operational consequences
- explicit documentation in repository-controlled records

Until such promotion occurs, local implementation decisions should remain local and should not be treated as platform-wide defaults.""",

    12: """# 12. Retrieval and Explanation Rules

Where this ADR affects retrieval, orchestration, recommendation, or execution behavior, the platform should preserve enough context to explain which architectural rule or control influenced the outcome.

Explanations should distinguish where relevant between:

- architectural policy
- implementation choice
- platform control
- workflow constraint
- approved exception

This ADR does not require exposing hidden internal chain-of-thought.

It does require preserving enough structure that consequential behavior can be understood and reviewed.""",

    13: """# 13. Prohibited Patterns

The following patterns are prohibited unless a future accepted ADR explicitly authorizes a tightly scoped exception:

- bypassing the governing intent of this ADR through hidden implementation shortcuts
- presenting non-governed behavior as if it were an approved platform standard
- silently overriding explicit architectural controls with convenience logic
- weakening traceability, provenance, reviewability, or accountability where this ADR requires them
- allowing repeated local exceptions to become de facto platform policy without review""",

    14: """# 14. Consequences

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
- Architecture leadership should monitor repeated exceptions or drift in this area.""",

    15: """# 15. Trade-Offs

- Benefit accepted: clearer architecture governance and stronger long-term consistency
- Cost accepted: additional review, documentation, and maintenance effort
- Complexity accepted: more explicit structure and control boundaries
- Speed sacrificed: some ad hoc implementation flexibility
- Risk reduced: undocumented drift, ambiguous ownership, and weak governance"""
}

FINAL_SECTION_TEMPLATE = """# 16. Final Rule

`apexcore` shall enforce the governing rule defined by this ADR unless a future accepted ADR explicitly supersedes or narrows it."""
# Used only if a file somehow lacks section 16 entirely.

def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")

def write_text(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")

def extract_sections(text: str):
    pattern = re.compile(r'(?ms)^# (\d+)\.\s+.*?(?=^# \d+\.|\Z)')
    sections = {}
    order = []
    for m in pattern.finditer(text):
        block = m.group(0).rstrip() + "\n"
        num = int(m.group(1))
        sections[num] = block
        order.append(num)
    return sections, order

def replace_or_insert_section(sections: dict[int, str], section_number: int, content: str):
    sections[section_number] = content.strip() + "\n\n"

def build_normalized_text(original_text: str, sections: dict[int, str]) -> str:
    lines = original_text.splitlines()
    preamble_lines = []
    started = False
    for line in lines:
        if re.match(r"^# \d+\.\s+", line):
            started = True
            break
        preamble_lines.append(line)

    preamble = "\n".join(preamble_lines).rstrip() + "\n\n"
    ordered_sections = []
    for n in range(1, 17):
        if n in sections:
            ordered_sections.append(sections[n].rstrip())
    return preamble + "\n\n".join(ordered_sections) + "\n"

def normalize_file(path: Path) -> tuple[bool, list[str]]:
    text = read_text(path)
    sections, existing_order = extract_sections(text)
    changes = []

    # Insert missing generic sections 7 and 10..15
    for section_number, template in SECTION_TEMPLATES_7_TO_15.items():
        if section_number not in sections:
            replace_or_insert_section(sections, section_number, template)
            changes.append(f"inserted section {section_number}")

    # Ensure section 16 exists
    if 16 not in sections:
        replace_or_insert_section(sections, 16, FINAL_SECTION_TEMPLATE)
        changes.append("inserted section 16")

    # Apply specific final-rule upgrades
    if path.name in FINAL_RULE_UPDATES:
        replace_or_insert_section(sections, 16, FINAL_RULE_UPDATES[path.name])
        changes.append("updated section 16")

    # Rebuild only if numbering drift or any change exists
    normalized_needed = existing_order != sorted(existing_order) or any(n not in existing_order for n in range(1, 17))
    if changes or normalized_needed:
        new_text = build_normalized_text(text, sections)
        if new_text != text:
            write_text(path, new_text)
            return True, changes if changes else ["reordered sections"]
        return False, changes

    return False, changes

def main() -> int:
    if not ADR_DIR.is_dir():
        print(f"ERROR: ADR directory not found: {ADR_DIR}")
        return 1

    adr_files = sorted(ADR_DIR.glob("ADR-*.md"))
    if not adr_files:
        print("ERROR: no ADR files found")
        return 1

    updated = 0
    for path in adr_files:
        changed, changes = normalize_file(path)
        if changed:
            updated += 1
            if changes:
                print(f"[UPDATED] {path} :: {', '.join(changes)}")
            else:
                print(f"[UPDATED] {path}")
        else:
            print(f"[SKIPPED] {path}")

    print(f"\nDone. Updated {updated} ADR file(s).")
    return 0

if __name__ == "__main__":
    sys.exit(main())