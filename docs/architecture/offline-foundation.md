# Offline Operation Foundation

- **Status:** Foundation reference
- **Date:** 2026-08-19
- **Related:** ADR-0001, ADR-0003, PROJECT_CHARTER.md

## 1. Requirement

POS operation must survive unstable or no internet connectivity. Offline is first-class, not an afterthought.

Vietnam-specific fiscal behavior (official receipt, e-invoice) is **jurisdiction-dependent and deferred** — see Fiscalization module and dedicated Vietnam research.

## 2. Local-first operational actions

These must work on the device without server connectivity:

| Action | Local behavior |
| --- | --- |
| Open / modify order | Store locally with client-generated IDs |
| Add lines, modifiers | Same |
| Apply known menu/prices | From last synced catalog/menu/pricing snapshot |
| Record payment (cash) | Queue payment fact |
| Kitchen ticket display | From local order state |
| Inventory write-off trigger | Queue command; valuation may be provisional offline |
| Employee sign-in | Last-known credential/session policy (Block D) |

Cannot guarantee without sync:

- real-time Grab/external order intake
- central reporting
- Intelligence recommendations
- fiscal submission to government systems

## 3. Local identity and session

- Terminal has stable device identity registered with server when online
- Employee session cached with expiry policy (Product Owner — Block D)
- Offline login may use last-validated credentials within policy window
- All local actions attribute `actorId` and `terminalId`

## 4. Locally generated identifiers

- Client generates UUID v7 (time-sortable) for orders, lines, payments, movements
- Idempotency key = `{terminalId}:{clientCommandId}` for every mutating command
- Server deduplicates on idempotency key **plus semantic fingerprint**:
  - SAME key + SAME semantic operation → safe duplicate (return existing fact)
  - SAME key + DIFFERENT semantic operation → `IDEMPOTENCY_CONFLICT` (reject)
- Semantic fingerprint includes business-significant content (`factType`, `occurredAt`, business position, operational context, payload) and excludes server-generated metadata that may differ on retry (`factId`, `recordedAt`)

## 5. Synchronization boundary

```text
Local command queue
        ↓ upload when online
Server ingestion (idempotent)
        ↓
Operational Core modules persist facts
        ↓
Downstream: Costing replay, Analytics, Intelligence
```

Sync is pull + push:

- **Push:** queued commands with business chronology metadata
- **Pull:** catalog/menu/pricing/permission updates since cursor

## 6. Business chronology offline (ADR-0003)

Each queued command carries:

- `businessDate`, optional `businessTime`, `businessOrder`
- Device maintains monotonic `businessOrder` per business date per terminal
- Server never uses arrival order as costing tie-breaker
- Cross-terminal order conflicts on same date → `ORDER_UNRESOLVED` for affected cost streams

## 7. Conflict classes

| Class | Example | Handling |
| --- | --- | --- |
| **Idempotent retry** | Same command uploaded twice (same semantic fingerprint) | Server returns original result |
| **Idempotency conflict** | Same idempotency key reused for a different operation | Reject with `IDEMPOTENCY_CONFLICT` |
| **Version stale** | Menu price changed since snapshot | Policy: reject line or accept with snapshot flag (Product Owner) |
| **Stock unavailable** | Sale exceeds known stock | Allow negative stock per ADR-0003; label cost estimate |
| **Order merge** | Two devices edit same order | Exclusive order lock preferred; split orders if unavoidable (deferred) |
| **Clock skew** | Device date wrong | Flag for reconciliation; never fabricate business time |

## 8. Server reconciliation

After reconnect:

1. Ingest commands in stable idempotency-safe order
2. Validate structural context still valid (or store historical context from client snapshot)
3. Persist immutable facts
4. Trigger cost replay from earliest affected business position
5. Return sync result with accepted/rejected commands and revision pointers

## 9. Auditability after reconnect

- Local queue entries retained until server ACK
- Sync batch ID links device upload to server ingestion run
- Dangerous offline operations flagged in Audit & Risk if policy requires

## 10. Deferred

- Exact sync protocol (REST batch vs streaming — Block F)
- CRDT vs last-write-wins for specific entities
- Fiscal offline queue behavior (Vietnam)
- Full encryption at rest on device
