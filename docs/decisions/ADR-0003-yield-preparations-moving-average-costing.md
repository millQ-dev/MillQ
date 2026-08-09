# ADR-0003: Yield, Preparations, and Moving-Average Costing

- **Status:** Accepted
- **Date:** 2026-08-06
- **Last updated:** 2026-08-09
- **Accepted:** 2026-08-09
- **Decision owners:** Product Owner and System Architect
- **Related issue:** [#9 — Define money, units, yield and moving-average costing](https://github.com/millQ-dev/MillQ/issues/9)
- **Product Owner correction:** [Block A correction decisions](https://github.com/millQ-dev/MillQ/issues/9#issuecomment-5205173415)
- **Product Owner final clarification:** [Block A final clarification](https://github.com/millQ-dev/MillQ/issues/9#issuecomment-5227924209)
- **Acceptance record:** [Block A owner/architecture acceptance](https://github.com/millQ-dev/MillQ/issues/9#issuecomment-5231317411)
- **Related analysis:** [`block-a-money-units-yield-costing-analysis.md`](../architecture/block-a-money-units-yield-costing-analysis.md)
- **Depends on:** [ADR-0001](ADR-0001-initial-technology-stack.md), [ADR-0002](ADR-0002-money-quantity-units-rounding.md)

## Context

MillQ must connect purchased ingredients, preparations, recipes, actual production, warehouse balances, sales write-off, and food-cost reporting. The first valuation method is moving weighted average. Negative stock is allowed. A late-entered fact that was economically effective in the past must affect later derived costing history; a genuinely later receipt must not rewrite an earlier sale.

Restaurant production introduces another distinction:

- a preparation specification describes what should be consumed and produced;
- a production batch records what was actually consumed and produced.

If those concepts are combined, MillQ cannot measure yield variance. If a preparation is both produced into stock and recursively expanded at sale, the same physical inputs are written off twice.

## Decision

The following accepted rules govern later inventory, recipe, preparation, costing, and analytics implementation.

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
- last known issue-cost estimate effective from its business position forward, together with its source movement;
- open negative-stock deficits;
- unresolved receipt cost attached to quantities that resolved `UNKNOWN` deficits;
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

If the issue brings quantity to zero, any sub-minor residual is assigned to that issue so quantity and carrying value both become exactly zero. The last known issue-cost estimate may remain as metadata but not as an inventory asset.

### 6. Negative stock is visible and uses knowledge available at the sale

An outbound movement is allowed to cross below zero.

- The part covered by positive stock uses the current moving average.
- The deficit part is recorded as an open negative-stock deficit.
- Its issue cost uses the last known warehouse issue-cost estimate at that business position and is labeled `ESTIMATED_FROM_LAST_KNOWN`.
- If no defensible prior cost exists, status is `UNKNOWN`; MillQ must not manufacture a zero-cost claim.
- Negative stock is visible in operational screens, reports, and risk/audit context.
- Positive carrying value never becomes a negative inventory asset merely because physical quantity is negative.
- A genuinely later receipt does not revise that earlier issue. The issue changes only if a newly discovered or corrected business fact actually belongs before it in business chronology.

### 7. A genuinely later inbound resolves quantity without rewriting history

An inbound movement whose real business position is after a negative-stock issue may close the negative quantity, but it is not evidence that the goods existed at the earlier sale.

- Deficit quantities are resolved strictly oldest first by business position. A receipt cannot resolve a newer deficit while an older one for the same cost stream remains open.
- The earlier issue retains its `ESTIMATED_FROM_LAST_KNOWN` or `UNKNOWN` cost status and value.
- When the earlier issue has an estimated cost, the difference between the receipt cost for the resolved quantity and that earlier estimated issue cost is recorded at the receipt's business position as an auditable `NegativeStockResolutionDelta`; it is not attached as a revised cost of the earlier sale.
- When the earlier issue cost is `UNKNOWN`, the receipt acquisition cost for the quantity that resolves it is preserved separately as auditable unallocated/unresolved receipt cost. It is not discarded, converted to zero, or assigned retrospectively to the earlier sale. Exact schema naming and official-accounting destination remain deferred.

  `unallocatedResolvedCost = resolvedUnknownQuantity × receiptAcquisitionUnitCost`

- Receipt quantity remaining after deficit resolution creates positive stock at the receipt's own acquisition unit cost.
- From the receipt's business position forward, its acquisition unit cost becomes the last known issue-cost estimate for subsequent sales that occur while the cost stream remains negative. It never changes an issue before the receipt.
- A partially resolving receipt leaves the remaining negative quantity visibly open.
- The official-accounting destinations of `NegativeStockResolutionDelta` and unallocated/unresolved receipt cost require verified accounting policy; this ADR preserves the values but does not invent their posting accounts.

This prevents the classic distortion where `-5 @ 30` plus `+10 @ 40` appears to leave `5 @ 50`, without rewriting the earlier sale. The sale remains `5 @ 30`; the five real units left are `5 @ 40`; the `50` difference is a current resolution delta at receipt time.

### 8. Business chronology is total, deterministic, and independent of upload order

Every cost-affecting movement has:

- `businessDate`: mandatory real business-effective date;
- `businessTime`: optional exact business time, stored and used only when genuinely known;
- `businessOrder`: immutable order of economic operations within the business date;
- `recordedAt`: server recording time retained for audit only.

A supplier document additionally stores its supplier invoice/document number as a separate fact. That identifier is not a replacement for business date, optional real time, or business order.

Costing order is the immutable business position:

`businessDate ASC, businessOrder ASC`

- MillQ never invents `businessTime` to make a complete timestamp. A missing exact time remains missing.
- When exact times are genuinely known, `businessOrder` must respect them. When time is absent or equal, `businessOrder` preserves the established real economic sequence without using a technical timestamp.
- A movement entered later with an earlier business position is inserted at that real position and triggers replay from there.
- Server arrival, upload, database insertion, or synchronization order can never be a costing tie-breaker.
- Offline-created operations must preserve their business order through synchronization.
- If cross-device business order for a date cannot be established automatically, the affected cost stream is marked `ORDER_UNRESOLVED` for reconciliation; MillQ does not silently fall back to technical time or invent a business time.
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
- Unallocated/unresolved receipt cost created by resolution of an `UNKNOWN` deficit remains separately visible and traceable to the receipt and resolved deficit quantity.
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
12. Receipt cost assigned to resolution of an `UNKNOWN` deficit is preserved separately as unallocated/unresolved cost and never disappears.
13. A later receipt's unit cost applies as the estimate only to subsequent negative-stock issues, never to earlier ones.
14. Multiple open deficits are resolved oldest first by business position.
15. Every movement has a business date; exact business time is optional and never fabricated; supplier document number is a separate fact.
16. Replay of the same ordered business facts and algorithm version produces the same result regardless of upload order.
17. Recalculation appends revisions and never erases the previous result or changes the underlying movement fact.
18. A historical recipe/preparation operation retains the exact version used; creating a new version never changes old sales.
19. A preorder has no inventory movement and no inventory cost.
20. Normative loss needs no comment; configured material deviation is highlighted; accident/total/unusual loss requires reason, permission, and audit.

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

### Later receipt updates only subsequent negative-stock estimates

- last known issue-cost estimate is `30/unit`;
- a sale of `5` units into negative stock remains costed at `5 × 30 = 150`;
- a genuinely later receipt of `2` units at `40/unit` resolves two units of the old deficit, leaving the balance at `-3`;
- the earlier sale remains `150`, and the current resolution delta for those two units is `2 × (40 - 30) = 20`;
- from the receipt's business position, `40/unit` is the new known estimate;
- a subsequent sale of `1` unit while stock is still negative is estimated at `1 × 40 = 40`.

The receipt changes the estimate only forward from its real business position.

### Receipt cost resolving an `UNKNOWN` deficit is preserved

- a sale creates a `-5` deficit with cost `UNKNOWN`;
- a genuinely later receipt provides `2` units at `40/unit`, leaving quantity at `-3`;
- the earlier sale remains `UNKNOWN`;
- the full `2 × 40 = 80` receipt cost for the resolved quantity is stored separately as unallocated/unresolved receipt cost;
- `40/unit` becomes the estimate for subsequent negative-stock sales.

No part of the `80` disappears, becomes zero, or is assigned retrospectively to the old sale.

### Oldest deficit first

- `10:00`: sale creates deficit `-5`;
- `12:00`: another sale creates deficit `-3`;
- a later receipt adds `+6`;
- all `5` units of the `10:00` deficit are resolved first;
- the remaining `1` receipt unit resolves one unit of the `12:00` deficit;
- the `12:00` deficit remains open for `2` units.

Reversing upload order must not change this matching result.

### Late-entered historical receipt

- goods physically arrived on 31 July, so `businessDate = 2026-07-31`;
- exact receipt time is not known, so `businessTime` remains absent rather than being invented;
- supplier invoice/document number is stored separately;
- the receipt was entered on 3 August;
- a sale occurred on 1 August;
- `businessOrder` places the receipt at its established real 31 July position, and the 1 August sale cost is replayed.

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

### Use server recording order when business order is unresolved

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
- A genuine receipt updates the known estimate for subsequent negative-stock sales without rewriting previous sales.
- Receipt cost remains traceable even when it resolves a deficit whose historical issue cost is unknown.
- Warehouse economics and margin remain explainable.

### Negative / accepted cost

- Costing requires an ordered replay engine and dependency tracking.
- Reports need cost-status and revision concepts.
- A late-entered historical fact can legitimately change derived historical margin; a genuinely later fact cannot.
- Resolving negative stock with a genuinely later receipt can create a current resolution delta or unallocated/unresolved receipt cost whose official accounting destination still requires verification.
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
12. Receipt while stock remains negative updating the estimate only for subsequent negative-stock sales.
13. Receipt quantity resolving an `UNKNOWN` deficit preserving its full acquisition cost separately as unallocated/unresolved cost.
14. Multiple open deficits resolving strictly oldest first, including `-5`, `-3`, then `+6` leaving `2` of the second deficit open.
15. Receipt entered 3 August but physically received 31 July changing a 1 August issue; receipt physically received 2 August not changing it.
16. Mandatory business date, optional absent exact time, no fabricated time, and separate supplier document number.
17. Multiple receipts calculated by business chronology rather than upload order.
18. Business ordering surviving reversed offline upload order; unresolved order never falling back to server time.
19. Preorder creating no movement/cost and actual sale determining cost.
20. New recipe/preparation version leaving old sales unchanged; explicit historical-error correction triggering audited replay.
21. Replay idempotency and equal result hash on retry.
22. Cascading recalculation through a stock-tracked preparation into a later dish cost.
23. Report separation of final, estimated-from-last-known, unknown, order-unresolved, and separately preserved unresolved receipt cost.

## Product Owner directions incorporated

- [x] Business chronology outranks technical recording/upload order.
- [x] Late-entered historical facts trigger affected replay; genuinely later facts do not rewrite earlier sales.
- [x] Negative-stock sale uses the last known cost at its business position.
- [x] Business date is mandatory; exact time is optional and never fabricated; supplier document number is separate.
- [x] A genuine later receipt updates the estimate only for subsequent negative-stock sales.
- [x] Receipt cost resolving an `UNKNOWN` deficit is preserved separately and is never back-assigned automatically.
- [x] Multiple open deficits are resolved oldest first by business position.
- [x] Preorder creates no inventory cost or write-off.
- [x] Normal loss needs no comment; configured material deviation is highlighted; accident/total/unusual loss requires reason, permission, and audit.
- [x] A new recipe/preparation version never recalculates old sales by itself.

## Owner/architect acceptance record

- [x] Normative `PreparationSpecification` and actual `ProductionBatch` as separate records.
- [x] Expected output for planning and actual output for batch unit cost.
- [x] Material-only preparation cost for the first complete operating chain.
- [x] Zero-output batches as reasoned production loss.
- [x] Explicit `VIRTUAL` versus `STOCK_TRACKED` mode and the no-double-write-off invariant.
- [x] Moving weighted average per warehouse/item/valuation currency.
- [x] Quantity + carrying value as authoritative replay state.
- [x] Visible `ESTIMATED_FROM_LAST_KNOWN`, `UNKNOWN`, and `ORDER_UNRESOLVED` states.
- [x] Separate auditable representation for current `NegativeStockResolutionDelta` and unallocated/unresolved receipt cost, with exact schema naming and official accounting mapping deferred.
- [x] `businessDate + businessOrder` as costing position, optional real `businessTime`, separate supplier document number, and `recordedAt` as audit-only time.
- [x] Append-only cost calculation revisions and latest-successful operational reporting.

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
- Exact schema naming and official-accounting mapping of `NegativeStockResolutionDelta` and unallocated/unresolved receipt cost.
- Whether operational backdating may cross a closed period; official accounting treatment remains separately gated.
- Labour and overhead allocation.
- By-products, co-products, and multi-output allocation.
- Transfer costing between warehouses and legal entities.
- Period-close accounting correction mechanics.
