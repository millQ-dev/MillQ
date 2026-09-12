# ADR-0022: Professional Account & Cross-Business Access

- **Status:** Accepted (Architecture v1.3)
- **Date:** 2026-09-12
- **Accepted:** 2026-09-12 (PO architecture delta)
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, [ADR-0015](ADR-0015-privacy-residency-security.md) (Accepted — privacy / isolation / audit plane), [ADR-0018](ADR-0018-offline-multiplatform-runtime.md) (Accepted — offline), Identity & Access, Organization & Tenancy

## Context

External professionals (first use case: Accounting Company / External Accountant) need controlled access across independent restaurant clients without merging tenants or Operational Core truth. ADR-0015 froze isolation and exceptional-access *boundaries*; this ADR freezes the **Professional Account** model.

## Decision

### 1. Principal types

Ordinary Tenant membership and Professional cross-business access are **separate authorization paths**.

A single login / principal **MAY** hold:

- ordinary employee memberships;
- professional client access grants;

**simultaneously**. Do **not** conflate them.

### 2. Professional access model

Conceptually:

```text
Principal / User
  → optional ProfessionalProfile
  → ClientAccessGrant
  → Client Tenant / Business Group
  → Role + Scope
```

- Every client grant is **independent**.
- **No** role / scope inheritance between independent clients.

### 3. Tenant isolation

Professional access does **not** create a shared tenant.

Do **not** merge between clients:

- operational data;
- inventory;
- accounting truth;
- ledgers;
- orders;
- documents.

(Aligns with ADR-0015 tenant / Business Group isolation.)

### 4. Mutation context

Every domain mutation executes inside **exactly one** explicitly selected client Tenant context.

Cross-client domain mutation is **prohibited**.

### 5. Cross-client reads

Authorized cross-client **read aggregation** is allowed through explicit read models / workspaces.

Read aggregation must **not** create shared operational truth.

### 6. Client control

Each client explicitly **grants / revokes** professional access.

Revoking one client must **not** affect unrelated clients.

### 7. Professional organization

Architecture must allow future:

```text
ProfessionalOrganization
  → ProfessionalUser
  → ClientAssignment
```

First use case: **Accounting Company / External Accountant**.

Do **not** require Accounting Company UI in MVP.

### 8. Audit

Professional actions must record:

- principal;
- professional organization where relevant;
- client tenant;
- effective Role;
- Scope;
- action / command;
- timestamp;
- result;
- reason where required.

(Compatible with ADR-0015 professional audit minimums.)

### 9. Offline

Per ADR-0018: professional **cross-client offline mutation** remains **OUT OF SCOPE** unless separately accepted.

Professional mutation (online) still requires an explicitly selected client context.

### 10. Acceptance scope

Acceptance does **NOT** mean:

- accountant workspace implemented;
- accounting company UI implemented;
- cross-client mutation allowed;
- billing model decided.

## Consequences

- Identity & Access must distinguish ordinary membership grants from professional `ClientAccessGrant` paths.
- Reporting / accountant workspaces may aggregate authorized reads without merging Core ledgers.
- Does not weaken ADR-0015 Privacy Control Plane, PII Vault, or Egress Gate.

## Alternatives considered

- Conflate employee membership with professional grants — rejected.
- Shared tenant / inherited permissions across clients — rejected.
- Allow cross-client domain mutation — rejected.
- Require Accounting Company product UI in MVP — rejected.
- Implicit offline multi-client professional mutation — rejected (ADR-0018).
