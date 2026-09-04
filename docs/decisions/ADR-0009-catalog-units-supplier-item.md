# ADR-0009: Catalog, Units, and Supplier Item

- **Status:** Accepted
- **Date:** 2026-09-04
- **Accepted:** 2026-09-04
- **Decision owners:** Product Owner
- **Related:** ADR-0002, ADR-0003, ADR-0008, [`architecture-v1.2.md`](../architecture/architecture-v1.2.md)

## Context

A StockItem-only catalog and embedding supplier SKU/price/pack on the item identity cause null-heavy polymorphism and conflate purchasing with product identity. Real kitchens need: base units, supplier packs, multi-supplier pricing, and items that are inventory-only, sellable, recipe-bearing, or combinations.

## Decision

### CatalogItem + profiles (composition)

```text
CatalogItem
├── InventoryProfile?
├── SellableProfile?
├── RecipeProfile?
├── SupplyProfile?
├── NutritionProfile?
└── ComplianceProfile?
```

Do not use one giant polymorphic table with unrelated nullable columns as the long-term model. Profiles may be sparse; not all need implementation in Block C.

### Units & Packaging subdomain

```text
Unit
ItemUnitConversion
SupplierPack
```

Inventory ledger posts **normalized base quantities**. Source documents retain **actual supplier packaging**. Intrinsic unit conversion ≠ supplier pack definition.

### SupplierItem relationship

```text
Supplier → SupplierItem
  externalSku, externalName, catalogItemId, supplierPack, price, validFrom, priceTolerance?
```

One CatalogItem may have many SupplierItems. Do **not** put `supplierSku` / `supplierPrice` / `supplierPackage` on CatalogItem.

### Recipes

Recipe is a **graph** of versioned lines to CatalogItems that may themselves have recipes. Future `RecipeGraphResolver` must support recursion, cycle rejection, effective dates, yield, and historical reproduction. Published recipes change via new `RecipeVersion`.

`ProductVariant` may bind its own recipe (size variants).

Consumption modes remain aligned with ADR-0003 VIRTUAL / STOCK_TRACKED (`EXPLODE_RECIPE_ON_SALE` / `CONSUME_FINISHED_ITEM`) with exactly-one physical write-off.

### Cost

No universal `product.cost`. Use distinct cost concepts + `CostQuote` certainty (ADR-0003 statuses preserved).

## Consequences

### Positive

- Clean Block C path: SupplierItem → SupplierPack → GoodsReceipt → base-qty movements.
- Prevents channel/POS presentation fields leaking into CatalogItem.

### Negative / accepted cost

- More tables/types over time than a single StockItem row.
- Recipe graph resolver is deferred until recipe vertical — only invariants are frozen now.

## Rejected alternatives

- StockItem as sole catalog identity.
- Supplier fields on CatalogItem.
- Flat-only recipes with no preparation nesting.
- Silent in-place edit of published recipe versions.

## Acceptance

Accepted by Product Owner on **2026-09-04** as part of Architecture v1.2.
