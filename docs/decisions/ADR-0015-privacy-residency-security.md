# ADR-0015: Privacy, Residency, Egress, LLC Boundary & Security Control Plane

- **Status:** Accepted (Architecture v1.3)
- **Date:** 2026-09-04
- **Accepted:** 2026-09-12 (PO ACCEPT WITH DELTAS — kept as one control-plane ADR; not split)
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, ADR-0008, ADR-0011, ADR-0012 (Accepted), Identity module, ADR-0020, ADR-0021

## Context

MillQ operates for Vietnam restaurants under a Vietnam-oriented company context (foreign-owned MillQ LLC considerations). Privacy, residency, egress, tenant isolation, exceptional professional access, and government/support request handling are architecture concerns now; certificates and legal opinions are separate gates.

This ADR remains **one** security/privacy control-plane decision for now. It is **not** split in this acceptance.

## Decision

### Tenant / Business Group isolation

- Tenant / Business Group **operational truth remains isolated**.
- Professional cross–Business Group access does **NOT** create:
  - a shared tenant;
  - shared operational tables;
  - a shared ledger;
  - shared inventory;
  - inherited permissions between clients.
- Cross-business professional access is a **controlled exceptional access path**, not default membership.

### Professional access (boundary only — detailed model ADR PENDING)

Future professional roles (first use case: **External Accountant**) **MAY** receive explicit access grants to multiple independent client Business Groups / Tenants.

Each client requires an **independent** grant with its own:

- Role;
- Scope;
- lifecycle / revocation.

**No** permission inheritance between clients.

- Cross-client **READ** aggregation through **authorized read models** is architecturally permitted (no merging of tenant truth).
- Any **domain mutation** must execute inside **exactly ONE** explicitly selected client Business Group / Tenant context.
- Cross-client domain mutation is **prohibited by default**.

Audit of professional cross-business access/action must preserve at least:

- professional principal;
- professional organization where applicable;
- client Tenant / Business Group;
- effective Role / Scope;
- action / command;
- result;
- reason where required.

**Professional Account detailed model remains ADR PENDING** (not designed here).

### Privacy Control Plane / PII Vault

- **PII Vault** is an **architectural / logical** security boundary: sensitive personal data isolated from general operational tables; access minimized and audited.
- Acceptance does **NOT** require a separate microservice / deployable for MVP.
- Implementation **may** remain inside the **modular monolith** while preserving isolation, minimization, and controlled access.
- Consent and customer PII flows respect vault boundaries (Customer & Consent module when built).
- Migration (ADR-0011) cannot bypass the vault.

### Vietnam-primary data residency (direction)

- **Vietnam-primary** remains the **preferred / default** residency direction for regulated / primary operational and personal data.
- This is **not** an architectural claim that data can never cross borders.
- Any **approved** cross-border processing requires **Egress Gate** policy.
- Do **not** invent Vietnam legal requirements here; concrete legal obligations remain **LEGAL GATE** items.
- Exact hosting vendors and certifications = **LEGAL / OPS GATE**.

### Cross-border Egress Gate

- Any cross-border processor/subprocessor / external processing/export path requires an explicit egress control.
- Default for uncleared environments: **synthetic-data-only** or blocked egress.

Egress decisions must be attributable to at least:

- purpose;
- data categories;
- provider / recipient;
- destination / region where known;
- retention policy;
- approved provider / model / service;
- tenant context;
- audit / provenance.

Applicable to (non-exhaustive):

- AI / model providers (ADR-0020);
- speech providers (ADR-0021);
- migrations / integrations where relevant (ADR-0011);
- other external processing / export paths.

### Controller / processor roles

- Conceptual distinction recorded in architecture; contract text is LEGAL GATE.

### MillQ Vietnam LLC legal boundary

- Product architecture recognizes LegalEntity / tenant commercial structure separately from MillQ’s own corporate entity.
- Do not collapse restaurant LegalEntity with MillQ LLC.

### Security Control Plane / GovernmentRequestCase

- `GovernmentRequestCase` (or equivalent): tracked, authorized, audited handling of lawful requests.
- No silent bulk export of PII/operational data outside this plane.
- Distinct from ordinary AuditRecord of business actions.

### Support / break-glass access

- MillQ operational / support access must **not** become permanent unrestricted super-admin access.
- Architectural direction: **explicit reason**, **scoped** access, **time-limited** where applicable, **full audit**.
- Break-glass / support access is **distinct** from `GovernmentRequestCase`.
- Detailed support-access workflow may be deferred.

### Voice / speech data paths — purpose separation

Rules above cover speech as a data-processing path. Clarifications (see ADR-0021 for product Voice Interaction behavior):

| Class | Direction |
| --- | --- |
| **A. Transient Voice Interaction audio** | ADR-0021 **zero-retention default** applies after processing |
| **B. Deliberately submitted interview / learning / assessment audio** | May require retention for human review / evidence; **zero-retention must NOT be blindly inherited** |

Assessment / interview media requires an **explicit future policy** covering: purpose; consent / legal basis; retention period; deletion; reviewer permissions; transcript handling; model/provider egress.

**Workforce / Assessment remains ADR PENDING.**

Also:

- **Raw audio** and **transcripts** are regulated/sensitive processing paths under the Privacy Control Plane.
- External speech/model providers require the **Egress Gate**.
- **No biometric voice identification / voiceprint** by default.

## Consequences

- Intelligence and analytics prefer aggregated / non-PII evidence; PII access is exceptional and audited (ADR-0006 remains).
- Architecture acceptance does **not** equal PDPA/cybersecurity certification.
- Model/speech execution details: ADR-0020, ADR-0021 — they do not weaken this plane.
- Professional Account and Workforce/Assessment products need their own ADRs before implementation.
- Cross-client read models must not merge Operational Core ledgers.

## Alternatives considered

- Treat privacy as P1 research only — rejected.
- Split this ADR into multiple ADRs in this acceptance — deferred; kept as one control plane for now.
- Shared tenant / inherited permissions for accountants — rejected.
- PII Vault as mandatory separate microservice for MVP — rejected.
- Claiming data can never cross borders — rejected (Egress Gate is the control).
- Blind zero-retention for all audio including assessment/interview — rejected.
- Permanent unrestricted support super-admin — rejected.
