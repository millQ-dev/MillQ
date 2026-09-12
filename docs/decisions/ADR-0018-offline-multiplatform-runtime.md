# ADR-0018: Offline Multi-Platform Client Runtime

- **Status:** Accepted (Architecture v1.3)
- **Date:** 2026-09-04
- **Accepted:** 2026-09-12 (PO ACCEPT WITH DELTAS)
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, offline-foundation.md, ADR-0003, ADR-0010, ADR-0014 (Accepted), ADR-0015 (Accepted), ADR-0020, ADR-0021

## Context

`offline-foundation.md` states POS must work offline but does not freeze client platforms, local persistence, device gateway, or sync conflict authority. Those decisions are required before POS implementation.

## Decision

### 1. Clients

- **Browser**, **iPad/iOS**, and **Android** are first-class client targets.
- Acceptance does **not** require all clients to ship simultaneously.

### 2. Server authority

- The **server remains authoritative after synchronization**.
- Offline capability does **not** create a second permanent source of truth.

### 3. Offline data classes

| Class | Direction |
| --- | --- |
| **A. Offline-capable business command capture** | May be created locally with: device identity; actor; tenant / location / terminal context; business chronology; idempotency identity |
| **B. Server-authoritative reference / config data** | May be cached / versioned locally; client does **not** own canonical truth |
| **C. External-service outcomes** | Fiscal / payment / channel / AI / voice provider success must **never** be fabricated offline. Use explicit pending / unknown / queued (and related) states |

### 4. Business chronology

- `businessDate` / `businessTime` / `businessOrder` semantics **outrank** upload / receive order (ADR-0003).
- Technical upload timestamp must **not** determine economic truth.
- Never fabricate `businessTime`.

### 5. Sync contract (concepts required)

Architecture requires concepts equivalent to:

- Local Store;
- Outbox;
- Inbox;
- Sync Cursor / checkpoint;
- idempotent command / fact handling;
- entity-specific conflict policy.

Do **NOT** freeze a specific local database technology in this ADR.

### 6. Conflict policy

- Reject universal **last-write-wins**.
- Conflict resolution must be **domain / entity-specific**.

Examples:

- immutable **POSTED** history cannot be overwritten;
- published config / reference versions remain server-authoritative;
- duplicate commands use **idempotency**;
- economic history / replay uses **business chronology**;
- external provider outcomes use **provider / server authority**.

A detailed conflict matrix may remain implementation-later, but architecture **requires** that it exists.

### 7. Device identity

- Each operational installation / device has explicit **DeviceIdentity**.
- Offline commands must be attributable to: device; actor; Tenant / Business Group; Location; Terminal where applicable.
- Device access must be **revocable independently** where practical.
- Device gateway remains an edge path for print / KDS peripherals without baking routing into UI.

### 8. Local security

- Offline store must support **encrypted-at-rest** direction and **scoped** cached data.
- Do **not** treat client storage as trusted plaintext operational truth.

### 9. Professional access (ADR-0015)

- Professional cross–Business Group access remains exceptional.
- For MVP:
  - do **not** implicitly support offline multi-client mutations;
  - professional mutation requires an **explicit selected client context**;
  - offline professional **cross-client mutation** is **OUT OF SCOPE** unless separately accepted;
  - future Accountant Workspace may cache authorized read models under a **separate** policy.

### 10. Fiscal / payment / channel offline

- Offline **queue** is allowed (ADR-0014 and related).
- Never fabricate **ACCEPTED / SUCCESS** from an unavailable external provider.
- Preserve explicit state until real confirmation.

### 11. AI / Voice

- POS / KDS / printing and core order flow must remain usable **without** AI / voice connectivity (ADR-0020, ADR-0021).
- **No** mandatory local LLM / ASR model for MVP.
- Any future tiny local recognizer is a **separate future decision**.
- Voice and Production Intelligence inference remain server-side MVP capabilities (provider/deployment-neutral per ADR-0020/0021).

### 12. Acceptance scope

ADR-0018 acceptance freezes **architecture boundaries only**. It does **NOT** mean:

- sync protocol fully designed;
- all conflict rules implemented;
- local DB selected;
- all native clients complete.

`offline-foundation.md` remains the operational behavior reference alongside this ADR.

## Consequences

- POS vertical cannot start until this ADR is Accepted (or explicitly waived by PO with recorded risk) — now satisfied for architecture gate.
- Client / sync implementation remains deferred; no application code in this acceptance.

## Alternatives considered

- Browser-only MVP forever — rejected as sole long-term runtime.
- Client as sole / permanent authority for pricing / availability / economic truth — rejected.
- Universal last-write-wins — rejected.
- Fabricating external provider success offline — rejected.
- Mandatory on-device LLM/ASR for MVP — rejected.
- Implicit offline multi-client professional mutations — rejected for MVP.
- Freezing a specific local DB technology in this ADR — rejected.
