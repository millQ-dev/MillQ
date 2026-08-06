# ADR-0003: Yield, Preparations, and Moving-Average Costing

- **Status:** Proposed
- **Date:** 2026-08-06
- **Decision owners:** Product Owner and System Architect
- **Related issue:** [#9 — Define money, units, yield and moving-average costing](https://github.com/millQ-dev/MillQ/issues/9)
- **Product Owner correction:** [Block A correction decisions](https://github.com/millQ-dev/MillQ/issues/9#issuecomment-5205173415)
- **Related analysis:** [`block-a-money-units-yield-costing-analysis.md`](../architecture/block-a-money-units-yield-costing-analysis.md)
- **Depends on:** [ADR-0001](ADR-0001-initial-technology-stack.md), [Proposed ADR-0002](ADR-0002-money-quantity-units-rounding.md)

## Context

MillQ must connect purchased ingredients, preparations, recipes, actual production, warehouse balances, sales write-off, and food-cost reporting. The first valuation method is moving weighted average. Negative stock is allowed. A late-entered fact that was economically effective in the past must affect later derived costing history; a genuinely later receipt must not rewrite an earlier sale.

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

Editing composition, expected output, materialization mode, or a cost-affecting conversion creates a new version. Historical operations retain their referenced version. Creating a new version never recalculates old sales by itself. Only a dedicated historical-error correction may change the version referenced by a historical operation; that workflow requires narrow permission, mandatory reason, and immutable audit history.

#### `ProductionBatch`

An actual production fact containing at least:

- referenced specification version;
- warehouse and responsible employee;
- actual input movements and quantities;
- actual primary output and quantity;
- actual waste/loss and its configured severity/explanation result;
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

#### Loss and yield-variance controls

- Normal technological loss within the configured normative tolerance requires no comment.
- A material deviation from expected yield is visibly highlighted.
- A configured explanation threshold may require a comment for that deviation; no universal numerical threshold is invented in this ADR.
- Accident, total batch loss, or unusual write-off always requires a mandatory reason, narrow permission, and immutable audit history.
- The applicable norm and thresholds are versioned so later changes do not reinterpret an earlier batch.

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
- the event is treated as total batch loss and requires the sensitive-action controls defined above.

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
- last known average for `ESTIMATED_FROM_LAST_KNOWN` issue costing only;
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

### 6. Negative stock is visible and uses knowledge available at the sale

An outbound movement is allowed to cross below zero.

- The part covered by positive stock uses the current moving average.
- The deficit part is recorded as an open negative-stock deficit.
- Its issue cost uses the last known warehouse moving-average cost at that business position and is labeled `ESTIMATED_FROM_LAST_KNOWN`.
- If no defensible prior cost exists, status is `UNKNOWN`; MillQ must not manufacture a zero-cost claim.
- Negative stock is visible in operational screens, reports, and risk/audit context.
- Positive carrying value never becomes a negative inventory asset merely because physical quantity is negative.
- A genuinely later receipt does not revise that earlier issue. The issue changes only if a newly discovered or corrected business fact actually belongs before it in business chronology.

### 7. A genuinely later inbound resolves quantity without rewriting history

An inbound movement whose real business position is after a negative-stock issue may close the negative quantity, but it is not evidence that the goods existed at the earlier sale.

- Deficit quantities are resolved oldest first in business chronology for deterministic quantity state.
- The earlier issue retains its `ESTIMATED_FROM_LAST_KNOWN` or `UNKNOWN` cost status and value.
- Receipt quantity remaining after deficit resolution creates positive stock at the receipt's own acquisition unit cost.
- When the earlier issue has an estimated cost, the difference between the receipt cost for the resolved quantity and that earlier estimated issue cost is recorded at the receipt's business position as an auditable `NegativeStockResolutionDelta`; it is not attached as a revised cost of the earlier sale.
- When the earlier issue cost is `UNKNOWN`, the resolution delta remains `UNRESOLVED` rather than manufacturing a prior cost. The receipt can still establish the value of any positive quantity physically remaining after deficit resolution.
- A partially resolving receipt leaves the remaining negative quantity visibly open.
- The official-accounting destination of `NegativeStockResolutionDelta` requires the verified closed-period/accounting policy; it is not invented here.

This prevents the classic distortion where `-5 @ 30` plus `+10 @ 40` appears to leave `5 @ 50`, without rewriting the earlier sale. The sale remains `5 @ 30`; the five real units left are `5 @ 40`; the `50` difference is a current resolution delta at receipt time.

### 8. Business chronology is total, deterministic, and independent of upload order

Every cost-affecting movement has:

- `businessOccurredAt`: real business-effective instant;
- `businessOrder`: immutable order of economic operations when the instant/date alone is insufficient;
- `recordedAt`: server recording time retained for audit only.

Costing order is lexicographic:

`businessOccurredAt ASC, businessOrder ASC`

- Time is stored as an unambiguous instant; restaurant business date is a separate field.
- A movement entered later with an earlier business position is inserted at that real position and triggers replay from there.
- Server arrival, upload, database insertion, or synchronization order can never be a costing tie-breaker.
- Offline-created operations must preserve their business order through synchronization.
- If same-time cross-device business order cannot be established automatically, the affected cost stream is marked `ORDER_UNRESOLVED` for reconciliation; MillQ does not silently fall back to technical time.
- Exact issuance and reconciliation of `businessOrder` are specified in Blocks C and F without changing this invariant.

#### Preorders

A preorder creates no inventory issue and fixes no inventory cost. Cost is determined at the actual sale/write-off business event using the facts and recipe/preparation version applicable to that event.

### 9. Recalculation revises derived cost, not business facts

Late-entered or corrected movements whose real business position precedes affected operations, reversed cost-bearing movements, and explicit historical-error corrections can trigger replay. A genuinely later receipt, a preorder, or creation of a new recipe/preparation version does not trigger historical sale-cost replay by itself.

- Quantity, document amount, employee, reason, and original timestamps are immutable business facts after posting except through explicit reversal/correction workflows.
- Derived issue cost, carrying value, margin, and food cost may receive a new revision.
- The previous derived value remains queryable.
- Replay begins at the earliest affected movement for the cost stream and follows downstream dependencies such as a preparation output later consumed by a dish.
- A replay may stop only at a proven stable checkpoint where state and dependency inputs match the prior successful revision.
- Example: goods physically received on 31 July but entered on 3 August replay later operations from their 31 July business position. Goods first physically received on 2 August do not reprice a sale on 1 August.

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
- Reports can identify `FINAL`, `ESTIMATED_FROM_LAST_KNOWN`, `UNKNOWN`, and `ORDER_UNRESOLVED` cost/order states.
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
9. A genuinely later receipt never revises an earlier issue cost.
10. A late-entered historical fact is ordered by its real business position and can revise later derived cost.
11. Remaining real stock after negative-quantity resolution is valued at the genuine later receipt's acquisition cost; any difference is a current auditable resolution delta.
12. Replay of the same ordered business facts and algorithm version produces the same result regardless of upload order.
13. Recalculation appends revisions and never erases the previous result or changes the underlying movement fact.
14. A historical recipe/preparation operation retains the exact version used; creating a new version never changes old sales.
15. A preorder has no inventory movement and no inventory cost.
16. Normative loss needs no comment; configured material deviation is highlighted; accident/total/unusual loss requires reason, permission, and audit.

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

### Negative stock and a genuinely later receipt

- issue `5` units while stock is zero;
- last known cost at the sale is `30/unit`, so sale issue cost is `150` with status `ESTIMATED_FROM_LAST_KNOWN`;
- goods are genuinely received later: `10` units at `40/unit`;
- the earlier sale remains `150`;
- remaining positive stock is `5` units with carrying value `200`, average `40/unit`;
- current `NegativeStockResolutionDelta` at receipt time is `5 × (40 - 30) = 50`.

The `50/unit` distortion from naive `-150 + 400` is not allowed, and the later receipt does not rewrite the sale.

### Late-entered historical receipt

- goods physically arrived on 31 July;
- the receipt was entered on 3 August;
- a sale occurred on 1 August;
- the receipt is inserted at its real 31 July business position and the 1 August sale cost is replayed.

If the goods physically arrived only on 2 August, the 1 August sale is not replayed.

## Alternatives considered

### One mutable recipe record

Rejected. It cannot preserve historical write-off and hides which norm a batch or sale used.

### Normative output for all batch costing

Rejected. It masks actual yield variance and produces misleading stock value.

### Recursive and stock-tracked write-off together

Rejected. It double-consumes the same physical ingredients.

### Negative quantity with negative carrying value in the normal average

Rejected. A later receipt can inflate the cost of real remaining stock.

### Always revise a negative issue using the next receipt

Rejected by Product Owner. A genuinely later receipt did not exist at the earlier sale and cannot rewrite it. Only a fact that actually preceded the sale can change that sale's derived cost.

### Use server recording order for same-time movements

Rejected by Product Owner. Upload and offline synchronization order are technical accidents, not business chronology.

### Overwrite prior derived cost during replay

Rejected. It destroys audit evidence and prevents explaining changed historical margins.

### Average across all warehouses

Rejected. It hides location economics and values a sale using stock that was not consumed there.

## Consequences

### Positive

- Norm and actual production can be compared directly.
- Real kitchen yield drives real preparation cost.
- Both virtual and stock-tracked preparations are supported safely.
- Negative stock remains operationally possible while showing when cost comes from the last known value or is unknown.
- Late-entered historical receipts correct later food cost; genuinely new receipts leave earlier sale cost unchanged.
- Warehouse economics and margin remain explainable.

### Negative / accepted cost

- Costing requires an ordered replay engine and dependency tracking.
- Reports need cost-status and revision concepts.
- A late-entered historical fact can legitimately change derived historical margin; a genuinely later fact cannot.
- Resolving negative stock with a genuinely later receipt creates a current resolution delta whose official accounting destination still requires verification.
- Stock-tracked preparations require production discipline.
- Unknown costs may remain until a genuine historical fact or explicit correction supplies defensible earlier cost.
- Period closure requires business and legal policy before implementation.

## Validation plan

When implementation is authorized, tests must include:

1. The numerical and chronology examples above.
2. Property-based proportional scaling across positive decimal factors.
3. Yield below, equal to, and above 100%.
4. Actual output differing from expected output.
5. Normal normative loss with no comment, highlighted deviation at a configured threshold, and total/unusual loss requiring permission/reason/audit.
6. Virtual preparation recursive issue exactly once.
7. Stock-tracked preparation input issue + output receipt + later output issue, with no recursive double write-off.
8. Moving average over multiple receipts and partial issues.
9. Exact zero quantity/carrying-value closure with residual assignment.
10. Negative issue with known and unknown prior cost.
11. Genuinely later receipt leaving earlier sale cost unchanged, valuing remaining real stock at receipt cost, and creating a current resolution delta.
12. Receipt entered 3 August but physically received 31 July changing a 1 August issue; receipt physically received 2 August not changing it.
13. Multiple receipts calculated by business chronology rather than upload order.
14. Same-time business ordering surviving reversed offline upload order; unresolved order never falling back to server time.
15. Preorder creating no movement/cost and actual sale determining cost.
16. New recipe/preparation version leaving old sales unchanged; explicit historical-error correction triggering audited replay.
17. Replay idempotency and equal result hash on retry.
18. Cascading recalculation through a stock-tracked preparation into a later dish cost.
19. Report separation of final, estimated-from-last-known, unknown, and order-unresolved states.

## Product Owner directions incorporated

- [x] Business chronology outranks technical recording/upload order.
- [x] Late-entered historical facts trigger affected replay; genuinely later facts do not rewrite earlier sales.
- [x] Negative-stock sale uses the last known cost at its business position.
- [x] Preorder creates no inventory cost or write-off.
- [x] Normal loss needs no comment; configured material deviation is highlighted; accident/total/unusual loss requires reason, permission, and audit.
- [x] A new recipe/preparation version never recalculates old sales by itself.

## Remaining owner/architect acceptance checklist

- [ ] Accept normative `PreparationSpecification` and actual `ProductionBatch` as separate records.
- [ ] Accept expected output for planning and actual output for batch unit cost.
- [ ] Accept material-only preparation cost for the first complete operating chain.
- [ ] Accept zero-output batches as reasoned production loss.
- [ ] Accept explicit `VIRTUAL` versus `STOCK_TRACKED` mode and the no-double-write-off invariant.
- [ ] Accept moving weighted average per warehouse/item/valuation currency.
- [ ] Accept quantity + carrying value as authoritative replay state.
- [ ] Accept visible `ESTIMATED_FROM_LAST_KNOWN`, `UNKNOWN`, and `ORDER_UNRESOLVED` states.
- [ ] Accept current `NegativeStockResolutionDelta` for a genuinely later receipt, with official accounting mapping deferred to verification.
- [ ] Accept `businessOccurredAt + businessOrder` as costing order and `recordedAt` as audit-only time.
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
- Exact creation/reconciliation mechanism for cross-device `businessOrder` (Blocks C/F); server arrival is prohibited as fallback.
- Official-accounting mapping of `NegativeStockResolutionDelta`.
- Labour and overhead allocation.
- By-products, co-products, and multi-output allocation.
- Transfer costing between warehouses and legal entities.
- Period-close accounting correction mechanics.
