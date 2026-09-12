# ADR-0020: Production Intelligence Execution & Model Gateway

- **Status:** Accepted (Architecture v1.3)
- **Date:** 2026-09-12
- **Accepted:** 2026-09-12 (PO strategic review — hosting delta)
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, [ADR-0006](ADR-0006-production-intelligence-boundary.md) (Accepted — **not superseded**), [ADR-0015](ADR-0015-privacy-residency-security.md), [ADR-0018](ADR-0018-offline-multiplatform-runtime.md), [ADR-0019](ADR-0019-economic-facts-contribution-margin.md)

## Context

ADR-0006 freezes that Production Intelligence must not own or mutate Operational Core truth. Product Owner accepted an **execution** direction: how recommendations are produced (projections, EvidenceBundle, ModelGateway) without turning LLM access into arbitrary database power or restaurant-local model hosting — and without freezing a single hosting deployment as a mandatory MVP invariant.

## Decision

### Relationship to ADR-0006

- ADR-0006 remains **Accepted** and is **not** superseded by this ADR.
- Operational Core remains the sole source of operational truth.
- This ADR only specifies the **execution / gateway** boundary for Intelligence inference.

### Execution model

Production Intelligence operates on:

- tenant-scoped projections / read models;
- deterministic analytics;
- forecasts / optimization artifacts;
- typed recommendations.

**LLM / generative models do not have arbitrary SQL or database access.**

Before model inference, an **EvidenceBuilder** (or equivalent approved-tool path) constructs a typed **EvidenceBundle** from authorized projections and approved tools only.

### ModelGateway + ApprovedModelRegistry

Architectural contracts (not deployables/microservices):

| Contract | Role |
| --- | --- |
| `ModelGateway` | Sole path for model inference requests (prompt/schema/evidence in → structured result out) |
| `ApprovedModelRegistry` | Which model/provider versions are approved for which purpose |

Concrete vendor/model is **swappable**. Registry + gateway remain the contract. Architecture is **provider- and deployment-neutral**.

### Hosting / deployment direction

- **Preferred / default target:** Vietnam-hosted / self-hosted inference in **MillQ-controlled Vietnam infrastructure**, where economically, legally, and operationally justified.
- This preferred target is **not** a mandatory MVP architecture invariant. Deployment choice remains open under the gateway contracts.
- **Vietnam-primary data / privacy direction** remains (ADR-0015); hosting preference must not weaken residency, PII, or egress rules.
- **Model weights are NOT installed on restaurant POS / client machines in MVP.**
- POS operational flow **must not depend** on AI availability (aligns with ADR-0018).

Approved external model providers **MAY** be used in production through:

```text
ModelGateway
  → ApprovedModelRegistry
  → ADR-0015 Egress Gate
```

Specific models/providers (OpenAI, Kimi, Qwen*, etc., including **Qwen3.8-27B-FP8** as a possible candidate) are **replaceable candidates**, not permanent architecture invariants.

### Privacy & provenance

- Raw PII is **excluded from model inputs by default** (ADR-0015 Privacy / PII Vault).
- Every recommendation retains provenance: evidence refs, model id/version, prompt/schema identity, generation metadata.
- AI **cannot** mutate Operational Core directly.
- Path: `Recommendation → human accept/reject → normal domain command → audit` (ADR-0006).

### Explicitly out of this ADR / future risk-classified

Employee scoring, termination support, customer profiling, and similar high-risk capabilities are **separate future** risk-classified decisions — not implied by accepting this gateway.

## Consequences

- Intelligence algorithms / GPU / vLLM / model installs are **implementation later**, not part of architecture alignment PRs.
- ADR-0019 economic facts may feed EvidenceBundles; they remain read-side and do not become a ledger.
- Voice (ADR-0021) may call ModelGateway for informational queries via EvidenceBuilder; same non-mutation rules.
- Choosing self-hosted Vietnam vs approved external production providers is an operational/legal decision under this ADR + ADR-0015 — not a code-path bypass of ModelGateway.

## Alternatives considered

- LLM with direct DB/SQL access — rejected.
- On-device restaurant model weights for MVP — rejected.
- Treating a specific vendor model as permanent architecture invariant — rejected.
- Freezing centralized Vietnam self-hosted inference as a **mandatory** MVP architecture invariant — rejected (preferred/target only).
- Superseding ADR-0006 — rejected.

## LEGAL GATES

- Cross-border model provider use requires Egress Gate clearance (ADR-0015).
- Architecture acceptance ≠ approval of a specific commercial model license or data-processing agreement.
