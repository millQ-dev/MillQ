# ADR-0003: Yield, Preparations, and Moving-Average Costing

- **Status:** Proposed
- **Date:** 2026-08-06
- **Decision owners:** Product Owner and System Architect
- **Related issue:** [#9 — Define money, units, yield and moving-average costing](https://github.com/millQ-dev/MillQ/issues/9)
- **Related analysis:** [`block-a-money-units-yield-costing-analysis.md`](../architecture/block-a-money-units-yield-costing-analysis.md)
- **Depends on:** [ADR-0001](ADR-0001-initial-technology-stack.md), [Proposed ADR-0002](ADR-0002-money-quantity-units-rounding.md)

## Context

MillQ must connect purchased ingredients, preparations, recipes, actual production, warehouse balances, sales write-off, and food-cost reporting. The first valuation method is moving weighted average. Negative stock is allowed, and backdated receipts must affect later derived costing history without destroying the original business facts.

Restaurant production introduces another distinction:

- a preparation specification describes what should be consumed and produced;
- a production batch records what was actually consumed and produced.

If those concepts are combined, MillQ cannot measure yield variance. If a preparation is both produced into stock and recursively expanded at sale, the same physical inputs are written off twice.

## Decision

If accepted, the following rules govern later inventory, recipe, preparation, costing, and analytics implementation.

### 1. Specification and batch are separate facts

#### `PreparationSpecification`

A normative, immutable version containing at least:

- identity and version validity;
- scale basis;
- expected input rows and quantities;
- expected primary output and quantity;
- expected process waste/loss where meaningful;
- process/technology instructions;
- materialization mode: `VIRTUAL` or `STOCK_TRACKED`.

Editing composition, expected output, materialization mode, or a cost-affecting conversion creates a new version. Historical operations retain their referenced version.

#### `ProductionBatch`

An actual production fact containing at least:

- referenced specification version;
- warehouse and responsible employee;
- actual input movements and quantities;
- actual primary output and quantity;
- actual waste/loss and mandatory reason where applicable;
- effective and recorded timestamps;
- resulting cost revision reference.

The batch does not rewrite its specification.

### 2. Expected and actual yield remain distinct

For a preparation with a meaningful comparable input basis:

`expectedYield = expectedOutputQuantity / expectedComparableInputQuantity`

`actualYield = actualOutputQuantity / actualComparableInputQuantity`

Yield must record its basis. MillQ does not infer a single percentage when inputs and outputs have incompatible dimensions or when a multi-ingredient process makes the denominator ambiguous.

- Yield below 100% may reflect trimming, evaporation, or process loss.
- Yield above 100% may reflect absorbed water or added material and is not automatically invalid.
- Expected output drives planning cost.
- Actual output drives actual batch unit cost.

### 3. Initial preparation cost is material cost

For the first complete operating chain:

`batchMaterialCost = sum(cost of actual input inventory movements)`

For a non-zero actual primary output:

`actualOutputUnitCost = batchMaterialCost / actualPrimaryOutputQuantity`

The batch's output inventory movement receives the batch material cost. Later issues consume that carrying value through moving average.

Labour, production overhead, freight allocation beyond accepted purchase cost, and multi-output cost allocation are not silently included. They require later approved policy and Vietnam accounting verification.

If actual primary output is zero:

- no unit cost is produced;
- consumed material cost is recorded as production loss;
- a reason and sensitive-action audit record are required.

### 4. Preparation materialization is exclusive

#### Virtual preparation

- No inventory balance exists for the preparation.
- The consuming recipe recursively expands it to leaf stock items using the effective recipe/preparation versions.
- Cost and write-off use those leaf movements.

#### Stock-tracked preparation

- A `ProductionBatch` consumes input inventory once and creates preparation inventory.
- The consuming dish/sale issues the preparation stock.
- The consuming path must not recursively issue the preparation's ingredients again.

Invariant: one physical input consumption produces one and only one inventory issue path.

### 5. Moving weighted average is warehouse scoped

The cost stream is scoped by:

`warehouse + stockItem + valuationCurrency`

Its replay state contains:

- on-hand quantity;
- positive carrying value;
- derived current average when positive quantity exists;
- last known average for provisional estimation only;
- open negative-stock deficits;
- cost status and calculation revision.

The authoritative state is quantity plus carrying value. Average unit cost is derived.

#### Positive inbound

When no negative deficit is open:

`newQuantity = oldQuantity + inboundQuantity`

`newCarryingValue = oldCarryingValue + inboundCost`

`newAverage = newCarryingValue / newQuantity`

#### Positive covered outbound

For quantity available in positive stock:

`issueCost = outboundQuantity × currentAverage`

`newQuantity = oldQuantity - outboundQuantity`

`newCarryingValue = oldCarryingValue - issueCost`

If the issue brings quantity to zero, any sub-minor residual is assigned to that issue so quantity and carrying value both become exactly zero. Last known average may remain as metadata but not as an inventory asset.

### 6. Negative stock is visible and cost is provisional

An outbound movement is allowed to cross below zero.

- The part covered by positive stock uses the current moving average.
- The deficit part is recorded as an open negative-stock deficit.
- Its operational cost status is `PROVISIONAL` using the last known warehouse cost when one exists.
- If no defensible prior cost exists, status is `UNKNOWN`; MillQ must not manufacture a zero-cost claim.
- Negative stock is visible in operational screens, reports, and risk/audit context.
- Positive carrying value never becomes a negative inventory asset merely because physical quantity is negative.

### 7. Later inbound covers the oldest deficit first

Inbound quantity first covers open deficits for the same warehouse/item/currency in costing order.

- Matching is oldest deficit first.
- Matched deficit quantity is valued at the covering inbound's acquisition unit cost.
- Any previous provisional issue cost receives an append-only cost revision.
- Remaining inbound quantity, after all possible deficit coverage, creates positive stock at its own remaining acquisition cost.
- A partially covering inbound leaves the unmatched deficit open and visibly provisional/unknown.

This prevents the classic distortion where `-5 @ 30` plus `+10 @ 40` appears to leave `5 @ 50`. Under this decision, five deficit units are revised to 40 and the five real units left are also valued at 40.

### 8. Costing chronology is total and deterministic

Every cost-affecting movement has:

- `effectiveAt`: business-effective instant;
- `postingSequence`: immutable server-assigned sequence.

Costing order is lexicographic:

`effectiveAt ASC, postingSequence ASC`

- Time is stored as an unambiguous instant; restaurant business date is a separate field.
- A movement entered later with an earlier `effectiveAt` is backdated and is inserted at its effective position.
- Events with equal `effectiveAt` retain server posting order; no hidden document-type priority is invented.
- Offline client time, server receipt time, device identity, and reconciliation rules are retained but specified in later blocks.

### 9. Recalculation revises derived cost, not business facts

Backdated movements, reversed cost-bearing movements, recipe-version corrections, and negative-deficit coverage can trigger replay.

- Quantity, document amount, employee, reason, and original timestamps are immutable business facts after posting except through explicit reversal/correction workflows.
- Derived issue cost, carrying value, margin, and food cost may receive a new revision.
- The previous derived value remains queryable.
- Replay begins at the earliest affected movement for the cost stream and follows downstream dependencies such as a preparation output later consumed by a dish.
- A replay may stop only at a proven stable checkpoint where state and dependency inputs match the prior successful revision.

Each `CostRecalculationRun` records at least:

- immutable run ID;
- trigger and actor/system identity;
- requested scope and earliest affected position;
- algorithm version;
- start/end/status/failure;
- affected movements and dependent outputs;
- before/after value summaries;
- deterministic input/output hashes or equivalent evidence.

Each changed movement receives a linked cost revision containing old and new value/status and the causing run.

### 10. Reports expose cost certainty and revision

- Operational reports default to the latest successful cost revision.
- Reports can identify `FINAL`, `PROVISIONAL`, and `UNKNOWN` cost.
- Negative quantity is never hidden by a positive aggregate elsewhere.
- Users with permission can inspect originally calculated cost and the revision chain.
- Revenue, payment, quantity, and other closed business facts are not changed by cost replay.
- Official accounting correction behavior for closed periods remains a verified-policy gate, not an inference.

## Invariants

1. Proportional normative scaling does not change normalized unit cost.
2. Expected output and actual output are never silently substituted for each other.
3. Actual batch unit cost uses actual output when non-zero.
4. Zero actual output produces a loss, not an infinite/zero fabricated unit cost.
5. One physical consumption has exactly one write-off path.
6. Moving average is never mixed across warehouses, stock items, or currencies.
7. A zero quantity has zero carrying value.
8. Negative stock is visible and its uncertain cost is labeled.
9. Covering negative stock cannot inflate the unit cost of remaining real stock through negative carrying value.
10. Replay of the same ordered facts and algorithm version produces the same result.
11. Recalculation appends revisions and never erases the previous result or changes the underlying movement fact.
12. A historical recipe/preparation operation retains the exact version used.

## Mandatory examples

### Garlic yield normalization

`1000 g` raw garlic costs `100000 VND` and produces `825 g` peeled:

`100000 / 825 = 121.212121212121... VND/g`

At proportional scale `0.2`, `200 g` costs `20000 VND` and produces `165 g`:

`20000 / 165 = 121.212121212121... VND/g`

The normalized unit cost is unchanged.

### Actual preparation batch

Actual input movement cost `50000 VND`; actual output `200 g`:

`50000 / 200 = 250 VND/g`

A dish consuming `10 g` receives:

`10 × 250 = 2500 VND`

### Positive moving average

Opening stock `20` units with carrying value `600` (`30/unit`) plus receipt `10` units costing `350`:

`newAverage = (600 + 350) / (20 + 10) = 31.666666.../unit`

The displayed value may be `31.67`, but the next issue uses the stored exact carrying value, not the displayed rate.

### Negative stock coverage

- issue `5` units while stock is zero;
- last known estimate is `30/unit`, so provisional issue cost is `150`;
- receive `10` units at `40/unit`;
- receipt covers the five-unit deficit at `40`, revising issue cost to `200`;
- remaining positive stock is `5` units with carrying value `200`, average `40/unit`.

The `50/unit` distortion from naive `-150 + 400` is not allowed.

## Alternatives considered

### One mutable recipe record

Rejected. It cannot preserve historical write-off and hides which norm a batch or sale used.

### Normative output for all batch costing

Rejected. It masks actual yield variance and produces misleading stock value.

### Recursive and stock-tracked write-off together

Rejected. It double-consumes the same physical ingredients.

### Negative quantity with negative carrying value in the normal average

Rejected. A later receipt can inflate the cost of real remaining stock.

### Never revise provisional issue cost

Rejected. It leaves food cost disconnected from the acquisition that resolved the missing stock.

### Overwrite prior derived cost during replay

Rejected. It destroys audit evidence and prevents explaining changed historical margins.

### Average across all warehouses

Rejected. It hides location economics and values a sale using stock that was not consumed there.

## Consequences

### Positive

- Norm and actual production can be compared directly.
- Real kitchen yield drives real preparation cost.
- Both virtual and stock-tracked preparations are supported safely.
- Negative stock remains operationally possible without pretending its cost is final.
- Backdated receipts can correct later food cost while preserving every historical fact and calculation revision.
- Warehouse economics and margin remain explainable.

### Negative / accepted cost

- Costing requires an ordered replay engine and dependency tracking.
- Reports need cost-status and revision concepts.
- A later receipt can legitimately change derived historical margin.
- Stock-tracked preparations require production discipline.
- Unknown/provisional costs may remain until missing receipts or corrections arrive.
- Period closure requires business and legal policy before implementation.

## Validation plan

When implementation is authorized, tests must include:

1. The four mandatory examples above.
2. Property-based proportional scaling across positive decimal factors.
3. Yield below, equal to, and above 100%.
4. Actual output differing from expected output.
5. Zero-output batch becoming reasoned loss.
6. Virtual preparation recursive issue exactly once.
7. Stock-tracked preparation input issue + output receipt + later output issue, with no recursive double write-off.
8. Moving average over multiple receipts and partial issues.
9. Exact zero quantity/carrying-value closure with residual assignment.
10. Negative issue with known and unknown prior cost.
11. Partial and multiple deficit-covering receipts, oldest deficit first.
12. Backdated receipt changing later issue cost but not movement facts.
13. Deterministic same-timestamp posting-sequence ordering.
14. Replay idempotency and equal result hash on retry.
15. Cascading recalculation through a stock-tracked preparation into a later dish cost.
16. Report separation of final, provisional, and unknown costs.

## Owner/architect acceptance checklist

- [ ] Accept normative `PreparationSpecification` and actual `ProductionBatch` as separate records.
- [ ] Accept expected output for planning and actual output for batch unit cost.
- [ ] Accept material-only preparation cost for the first complete operating chain.
- [ ] Accept zero-output batches as reasoned production loss.
- [ ] Accept explicit `VIRTUAL` versus `STOCK_TRACKED` mode and the no-double-write-off invariant.
- [ ] Accept moving weighted average per warehouse/item/valuation currency.
- [ ] Accept quantity + carrying value as authoritative replay state.
- [ ] Accept visible `PROVISIONAL` and `UNKNOWN` negative-stock cost.
- [ ] Accept oldest-deficit-first matching and covering-receipt cost revision.
- [ ] Accept chronology by `effectiveAt`, then immutable `postingSequence`.
- [ ] Accept append-only cost calculation revisions and latest-successful operational reporting.
- [ ] Decide whether operational backdating may cross a closed period; official accounting treatment remains separately gated.

## Legal/accounting verification gates

Before production use in Vietnam, verify with current official sources and a qualified local accountant:

- consistent use of perpetual moving weighted average for the launch entity;
- the acquisition and conversion costs included in inventory value;
- normal versus abnormal loss treatment;
- production labour/overhead treatment;
- unresolved negative stock at period close;
- backdated documents and corrections across closed periods;
- required supporting documents, approvals, and audit retention.

No fiscal/e-invoice behavior is defined by this ADR.

## Deferred decisions

- Exact inventory movement/document state machines and corrections (Block C).
- Concurrency, idempotency, checkpoints, and background execution (Blocks C/H).
- Access rules for posting, backdating, and recalculation (Block D).
- Recipe/modifier/effective-recipe lifecycle beyond the preparation foundation (Block E).
- Offline clock and reconciliation rules (Block F).
- Labour and overhead allocation.
- By-products, co-products, and multi-output allocation.
- Transfer costing between warehouses and legal entities.
- Period-close accounting correction mechanics.
