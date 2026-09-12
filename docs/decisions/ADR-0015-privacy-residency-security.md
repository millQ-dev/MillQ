# ADR-0015: Privacy, Residency, Egress, LLC Boundary & Security Control Plane

- **Status:** Proposed (Architecture v1.3)
- **Date:** 2026-09-04
- **Related:** Architecture v1.3, ADR-0011, ADR-0012, Identity module, ADR-0020, ADR-0021

## Context

MillQ operates for Vietnam restaurants under a Vietnam-oriented company context (foreign-owned MillQ LLC considerations). Privacy, residency, and government request handling are architecture concerns now; certificates and legal opinions are separate gates.

## Decision

### Privacy Control Plane

- **PII Vault:** sensitive personal data isolated from general operational tables; access audited.
- Consent and customer PII flows respect vault boundaries (Customer & Consent module when built).
- Migration (ADR-0011) cannot bypass the vault.

### Vietnam-primary data residency (intent)

- Regulated / primary operational and personal data designed for **Vietnam-primary** residency.
- Exact hosting vendors and certifications = **LEGAL / OPS GATE**, not invented here.

### Cross-border Egress Gate

- Any cross-border processor/subprocessor flow requires an explicit egress control (purpose, legal basis ref, destination, approval).
- Default for uncleared environments: **synthetic-data-only** or blocked egress.
- Applies to external model / speech providers used by Intelligence or Voice (ADR-0020, ADR-0021).

### Controller / processor roles

- Conceptual distinction recorded in architecture; contract text is LEGAL GATE.

### MillQ Vietnam LLC legal boundary

- Product architecture recognizes LegalEntity / tenant commercial structure separately from MillQ’s own corporate entity.
- Do not collapse restaurant LegalEntity with MillQ LLC.

### Security Control Plane / GovernmentRequestCase

- `GovernmentRequestCase` (or equivalent): tracked, authorized, audited handling of lawful requests.
- No silent bulk export of PII/operational data outside this plane.
- Distinct from ordinary AuditRecord of business actions.

### Voice / speech data paths (references — do not duplicate full Voice ADR)

Rules above cover speech as a data-processing path. Clarifications (see ADR-0021 for product behavior):

- **Raw audio** and **transcripts** are regulated/sensitive processing paths under the Privacy Control Plane.
- **Vietnam-primary processing** is the target for primary speech/Intelligence processing (same residency intent as other regulated data).
- External speech/model providers require the **Egress Gate**.
- Architecture must support **zero-retention of raw audio by default** after processing; longer transcript retention only via explicit policy.
- **No biometric voice identification / voiceprint** by default.

## Consequences

- Intelligence and analytics prefer aggregated / non-PII evidence; PII access is exceptional and audited (ADR-0006 remains).
- Architecture acceptance does **not** equal PDPA/cybersecurity certification.
- Model/speech execution details: ADR-0020, ADR-0021 — they do not weaken this plane.

## Alternatives considered

- Treat privacy as P1 research only — rejected.
- Single undifferentiated “Vietnam compliance module” — rejected; split profile vs providers vs privacy plane.
