# ADR-0024: Allergen & Dietary Constraint Resolution

- **Status:** Accepted (Architecture v1.3)
- **Date:** 2026-09-12
- **Accepted:** 2026-09-12 (PO architecture delta)
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, Catalog, Recipes & Costing, Menu Configuration, Orders, [ADR-0021](ADR-0021-voice-multilingual-interaction.md) (Accepted — voice/LLM query path), [ADR-0020](ADR-0020-intelligence-execution-model-gateway.md) (Accepted — Intelligence explains, does not invent composition), [ADR-0023](ADR-0023-workforce-recruiting-learning-assessment.md) (Accepted — training projections)

## Context

Guest and staff allergen / dietary questions must resolve from structured restaurant composition data. Free-text claims, LLM invention, or base MenuItem-only resolution create unsafe false certainty.

## Decision

### 1. Structured source

Allergen resolution must derive from **structured domain data**.

Conceptually:

```text
Ingredient / Catalog
  → Recipe / Preparation graph
  → Effective Recipe
  → Modifiers
  → configured Menu Item / Order item
  → Allergen & Dietary Resolution
```

Do **not** rely on guest-facing free text as source of truth.

### 2. Resolution states

Support typed states equivalent to:

| State | Notes |
| --- | --- |
| `CONTAINS` | |
| `MAY_CONTAIN` | |
| `CROSS_CONTAMINATION_RISK` | |
| `NOT_KNOWN_TO_CONTAIN` | **Not** a certification or guarantee |
| `UNKNOWN` | Must **never** silently become SAFE |

`UNKNOWN` must **NEVER** silently become SAFE.

`NOT_KNOWN_TO_CONTAIN` must **not** be presented as a certification or guarantee.

### 3. Effective Recipe

Modifiers / substitutions must recalculate allergen / dietary resolution for the **actual configured product**.

Do **not** resolve only against the base MenuItem.

### 4. Ownership

Allergen Resolver must **consume** Ingredient / Recipe / Effective Recipe data.

It must **not** duplicate or independently own recipe composition.

### 5. Dietary constraints

Architecture may support:

- vegetarian;
- vegan;
- gluten-related constraints;
- lactose-related constraints;
- halal-related constraints;
- religious / personal exclusions;
- custom avoids.

Do **not** claim certification or medical safety unsupported by source data.

### 6. Unknown / incomplete data

Incomplete ingredient / source information must remain visible as **uncertainty**.

Do **not** infer absence from missing data.

### 7. AI / Voice

AI / LLM may:

- query structured allergen result;
- explain it;
- translate it.

AI / LLM must **NOT**:

- invent ingredients;
- override `UNKNOWN`;
- claim safe from free text;
- bypass modifier / effective-recipe resolution.

Voice / text guest questions must resolve through the **structured engine first** (compatible with ADR-0021 menu-aware resolution; ADR-0020 EvidenceBuilder / ModelGateway must not invent composition).

### 8. Workforce integration

Workforce / Learning may consume allergen / menu projections for:

- training;
- exams;
- procedures.

Workforce must **not** own allergen truth (ADR-0023).

### 9. Acceptance scope

Acceptance does **NOT** mean:

- allergen UI implemented;
- legal allergen taxonomy finalized for every jurisdiction;
- certification system implemented;
- medical advice functionality implemented.

## Consequences

- Catalog / Recipes remain composition SoT; Allergen Resolver is a derived resolution boundary.
- POS / Voice / Intelligence surfaces consume resolution results — they do not invent them.
- Jurisdiction-specific labeling / certification remains LEGAL GATE / future JurisdictionProfile work — not invented here.

## Alternatives considered

- Guest free-text as allergen SoT — rejected.
- Resolve only against base MenuItem ignoring modifiers — rejected.
- Silent UNKNOWN → SAFE — rejected.
- Duplicate recipe composition inside allergen module — rejected.
- LLM invents ingredients / overrides UNKNOWN — rejected.
- Claim medical / certification guarantees without source data — rejected.
