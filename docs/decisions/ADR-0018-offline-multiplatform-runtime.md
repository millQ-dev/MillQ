# ADR-0018: Offline Multi-Platform Client Runtime

- **Status:** Proposed (Architecture v1.3)
- **Date:** 2026-09-04
- **Related:** Architecture v1.3, offline-foundation.md, ADR-0003, ADR-0010, ADR-0014, ADR-0020, ADR-0021

## Context

`offline-foundation.md` states POS must work offline but does not freeze client platforms, local persistence, device gateway, or sync conflict authority. Those decisions are required before POS implementation.

## Decision

Before POS implementation, the following are architectural requirements:

| Concern | Decision direction |
| --- | --- |
| Platforms | Browser, iPad/iOS, Android are first-class POS runtimes |
| Local persistence | Explicit encrypted local store per device (technology choice later; boundary now) |
| Device identity | Stable device registration; terminal binding |
| Sync | Server remains authority for conflict resolution of critical rules; clients queue idempotent commands |
| Conflicts / reconciliation | Business chronology (ADR-0003) outranks upload order; never fabricate `businessTime` |
| Device gateway | Edge path for print/KDS peripherals without baking routing into UI |
| Fiscal offline | Queue submissions; no fake government acceptance (ADR-0014) |
| AI / Voice offline | POS / KDS / printing remain fully usable without AI or voice connectivity (ADR-0020, ADR-0021) |
| Local models | No mandatory local LLM/ASR on restaurant device for MVP; any future tiny local recognizer is a **separate future decision** |

`offline-foundation.md` remains the operational behavior reference; this ADR elevates multi-platform runtime to a decision gate for POS.

Voice and Production Intelligence inference are **server-side MVP capabilities** (via ModelGateway / speech adapters per ADR-0020/0021; deployment provider-neutral), not prerequisites for offline POS.

## Consequences

- POS vertical cannot start until this ADR is Accepted (or explicitly waived by PO with recorded risk).
- No client implementation in v1.3 alignment PR.

## Alternatives considered

- Browser-only MVP forever — rejected as sole long-term runtime.
- Client as sole authority for pricing/availability — rejected.
