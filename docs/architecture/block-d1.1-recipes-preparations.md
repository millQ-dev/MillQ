# Block D1.1 Implementation — Recipes & Preparations Foundation

**Status:** Implemented on feature branch (awaiting independent full-diff strategic review)  
**ADRs:** ADR-0002, ADR-0003, ADR-0008, ADR-0009, ADR-0019, ADR-0024 (composition source only)  
**Autonomy:** Level C

## Boundary

Delivers server/domain foundation only:

- `RecipeSpecification` / `RecipeVersion` / `recipe_component`
- `PreparationSpecification` / `preparation_version` / `preparation_component`
- Materialization modes `VIRTUAL` | `STOCK_TRACKED`
- Normative input / output / yield ratio (when unit basis compatible)
- Nested preparation graph with cycle rejection (specification-identity graph)
- Published version immutability (new version required)

## Explicitly out of scope (not implemented)

ProductionBatch, actual yield, inventory movements, POS, Orders/Sales, modifiers, Effective Recipe, sale write-off, Food Cost, CM, payments, fiscalization, offline, floor/table, Workforce, Professional Workspace, allergen resolver, Intelligence recommendations.

## Invariants preserved

- No `product.cost` / mutable recipe cost SoT columns
- CatalogItem remains leaf identity (no duplicated catalog truth)
- New recipe version does not recalculate historical sales (no sales module; immutability of PUBLISHED versions)
- VIRTUAL does not bind output stock item; STOCK_TRACKED requires `output_catalog_item_id` for future single write-off path
- Component units must match catalog base unit or nested preparation output unit
