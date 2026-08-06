# Block A Analysis: Money, Units, Yield, and Costing

- **Status:** Revision 2 ready for owner/architect review; ADR-0002 and ADR-0003 remain Proposed
- **Date:** 2026-08-06
- **Related issue:** [#9 — Define money, units, yield and moving-average costing](https://github.com/millQ-dev/MillQ/issues/9)
- **Product Owner correction:** [Block A correction decisions](https://github.com/millQ-dev/MillQ/issues/9#issuecomment-5205173415)
- **Proposed decisions:** [ADR-0002](../decisions/ADR-0002-money-quantity-units-rounding.md), [ADR-0003](../decisions/ADR-0003-yield-preparations-moving-average-costing.md)
- **Scope:** Architecture and domain rules only. No restaurant application feature implementation.

## 1. Executive summary

Block A exists because a seemingly small rounding or yield decision can silently change stock, food cost, and margin across thousands of sales. ADR-0001 therefore blocks sales, inventory valuation, recipe write-off, and food-cost implementation until this foundation is accepted.

The recommended direction is:

1. Do not use JavaScript `number` for money, quantities, conversion factors, or cost calculations.
2. Persist posted financial amounts as integer currency minor units, with currency code and minor-unit exponent captured on the fact.
3. Keep derived inventory carrying value with sub-minor precision so allocation does not lose value; official rounding requires a versioned jurisdiction/context policy.
4. Exchange all domain decimals through APIs as canonical strings.
5. Give every stock item one immutable base unit and a typed dimension: mass, volume, or count.
6. Separate supplier package from inventory unit; support fixed packages and mandatory actual quantity for variable-weight packages.
7. Separate normative `PreparationSpecification` from actual `ProductionBatch`.
8. Use the batch's actual output for actual unit cost; use normative output only for planning.
9. Use moving weighted average per warehouse, stock item, and valuation currency.
10. Value a negative-stock sale from the last known cost at its business position; a genuinely later receipt never rewrites it, while a late-entered historical fact can trigger audited replay.
11. Never rewrite business movements during recalculation. Append a new calculation revision and preserve the previous result.
12. Order costing by real business chronology, never server arrival/upload order, and preserve same-time business order through offline synchronization.
13. Explicitly choose either virtual recursive preparation or stock-tracked production for each consumption path, never both.
14. Treat a preorder as non-costing: inventory cost is determined only at actual sale/write-off.
15. Never recalculate old sales merely because a new recipe/preparation version was created.

The numerical model is proposed for acceptance. Vietnam accounting treatment, tax/fiscal rounding, cash denomination rounding, foreign-exchange accounting, and closed-period correction policy still require dedicated local verification.

## 2. Authority and repository findings

- `PROJECT_CHARTER.md` is accepted and makes operational accuracy, auditability, and the first restaurant vertical authoritative.
- `ADR-0001-initial-technology-stack.md` is **Accepted**.
- ADR-0001 requires a dedicated money, quantity, UoM, and rounding decision before sales or costing code.
- The initial technology direction is TypeScript, Node.js, PostgreSQL, React clients, REST, a monorepo, and a modular monolith.
- The repository has no application runtime yet. Block A therefore changes documentation only.
- The Architecture Operator requires moving weighted average, visible negative stock, historical receipt chronology, auditable recalculation, normative and actual preparation output, and the proportional-scaling invariant.

## 3. Research method and limits

For each subject this analysis separates:

1. what is publicly observable in iiko;
2. the general restaurant-domain lesson;
3. the proposed MillQ design;
4. the Vietnam-specific implication;
5. legal/accounting verification still required;
6. Product Owner decision required;
7. deferred questions.

Public iiko manuals describe product behavior, not iiko's internal implementation. Some detailed manuals are archived product versions. They are useful evidence of domain behavior, but they are not treated as a current API contract and are not copied as MillQ architecture.

## 4. Research synthesis

### 4.1 Money, currency, exactness, and rounding

**1. Observed in iiko**

Public iiko documentation presents ingredient unit cost, recipe cost, and warehouse cost as separately calculated values. The public material is useful for workflows but does not establish a safe internal numeric representation for MillQ.

**2. General restaurant-domain lesson**

- Purchase totals and payment totals are currency amounts.
- A price per gram, moving-average cost per gram, discount rate, and yield rate are not currency amounts; they are decimal rates.
- Repeatedly rounding rates to visible currency precision causes cumulative stock and margin drift.
- Currency display precision and internal costing precision solve different problems.
- The ISO 4217 maintenance data identifies currency codes and minor-unit exponents. VND has exponent `0`; this does not itself define cash-denomination or tax-invoice rounding.
- ECMAScript `Number` is IEEE 754 binary64. Decimal fractions and sufficiently large integers are not all exact.
- PostgreSQL `numeric` is designed for exact monetary and quantity values, but a declared scale rounds values on storage. Boundaries must therefore be deliberate.

**3. Proposed MillQ design**

- `Money` (posted customer/supplier/payment amount): integer minor-unit amount + ISO currency code + captured minor-unit exponent.
- `CostValue` (derived carrying value): exact decimal expressed in the same minor-unit coordinate, with 12 fractional digits.
- `Rate` (unit price, unit cost, yield, conversion): exact decimal, with up to 18 fractional digits where division requires it.
- API and event contracts carry these values as canonical decimal strings, never JSON numbers.
- VND onboarding default: `VND`, exponent `0`; ISO metadata does not itself authorize an official rounding rule.
- Stock is valued in one ledger currency. Original foreign-currency amount and the accepted conversion snapshot remain separate facts; currencies are never averaged together.
- Official commercial calculation requires a versioned rounding policy selected by jurisdiction, legal entity, calculation context, and effective period. No universal official mode is proposed.
- A fixed authoritative document total may use deterministic largest-remainder allocation only when the applicable policy selects it; line amounts must still sum exactly to the total.
- Internal cost proposal: round only when persisting a `CostValue`, using nearest, ties to even, at 12 sub-minor digits. When quantity reaches zero, assign the remaining carrying-value residue to the final issue so both quantity and carrying value become exactly zero.

**4. Vietnam-specific implication**

- VND is the default valuation and presentation currency for a Vietnam operating entity.
- VND `Money` representation uses whole đồng under ISO exponent `0`, while unit costs may remain fractional đồng internally. The country/context policy—not the exponent—decides how an exact commercial calculation reaches that posted value.
- A legal entity's functional/accounting currency and any foreign-currency purchase treatment cannot be inferred only from restaurant location.

**5. Legal/accounting verification required**

- Confirm current Vietnam rules for accounting currency, invoice-line rounding, tax rounding, discounts, and foreign-currency purchases.
- Confirm whether any cash tender must round to a denomination larger than one đồng.
- Confirm how cost revisions crossing a closed accounting period must be represented in official books.
- Fiscal/e-invoice behavior is explicitly outside Block A.

**6. Product Owner decision / review status**

- Fixed: do not define a universal legally significant rounding rule before country/context research.
- Accept or reject the split between integer posted money and sub-minor derived cost.
- Accept or replace the proposed internal technical ties-to-even cost boundary.
- Accept decimal strings as the API representation.
- Confirm that the inventory ledger has exactly one valuation currency and never mixes currencies.

**7. Deferred question**

- Exact TypeScript decimal library and database mapping belong to the concrete-stack block.
- FX source, FX gains/losses, tax, and fiscal presentation require separate decisions.

### 4.2 Units, quantities, packages, and conversions

**1. Observed in iiko**

Current public iikoMini documentation uses a base unit for a product and supports receiving packages such as a box, barrel, or pack by specifying how many base units the package contains. Archived iikoOffice manuals likewise separate a base unit from receiving packages and show ingredient entry by package or gross/net mass.

**2. General restaurant-domain lesson**

- Mass, volume, and count are different dimensions and must not be silently mixed.
- A purchase package is a commercial presentation, not a new physical dimension.
- A bottle may convert exactly to millilitres; a piece of produce usually does not convert exactly to grams.
- Mass-to-volume conversion is ingredient-specific and often depends on density, preparation, and measurement conditions.
- Historical documents must retain the conversion that was used when posted; changing a supplier pack cannot rewrite old stock.

**3. Proposed MillQ design**

- Quantity is an exact decimal with 12 fractional digits in a stock item's base unit.
- Supported initial dimensions: `MASS`, `VOLUME`, `COUNT`.
- Recommended canonical units: gram (`g`), millilitre (`ml`), and each (`ea`). Display and entry may use kg, L, packs, bottles, cases, and other configured units.
- Each stock item has exactly one base unit. It cannot change after the first posted movement without an explicit migration.
- A count item may be marked `DISCRETE`; its base quantity must then be integral.
- Same-dimension conversions use versioned exact factors.
- `Package` is the supplier/purchasing presentation; `InventoryUnit` is the base unit in which stock is actually held.
- A fixed package has a versioned factor into the item's inventory unit: `6 × 1 L = 6 L`; `12 × 0.75 L = 9 L`.
- Variable-weight packages are mandatory: four meat packs actually accepted at `18.7 kg` post `18.7 kg`, not a nominal package weight.
- Cross-dimension conversion is rejected unless an item-specific, versioned conversion is explicitly configured. No global `1 ml = 1 g` assumption is allowed.
- Every posted line preserves entered quantity/UoM, package/conversion identity, factor snapshot where fixed, actual accepted base quantity, and any quantization delta.
- A measurement increment controls what staff can enter (for example 1 g or 0.1 g) independently of internal storage precision.
- `COUNT`/`ea` is a base unit only for products genuinely consumed as whole pieces. Products routinely consumed in parts use mass or volume even when delivered as pieces or bottles.

**4. Vietnam-specific implication**

Vietnamese supplier practice may use local package names, variable-weight cases, bottles, bags, and informal counts. Labels are localized, but the ledger still normalizes into the typed base unit.

**5. Legal/accounting verification required**

- Confirm whether regulated goods require specific statutory units or displayed precision.
- Alcohol, tax, customs, and fiscal unit rules are not inferred here.

**6. Product Owner decision / review status**

- Fixed: supplier package and inventory unit are separate.
- Fixed: variable-weight packages store actual accepted quantity.
- Fixed: `COUNT`/`ea` is limited to genuinely piece-consumed products.
- Accept initial dimensions and recommended canonical units.
- Confirm that item base unit becomes immutable after stock activity.
- Confirm that mass/volume conversion always needs item-specific evidence.

**7. Deferred question**

- Default measurement increments by product category and device capability.
- Variable-weight package UX and scale integrations.
- A broader UCUM-compatible code catalog may be added later without changing the dimensional rule.

### 4.3 Recipe scaling, edible yield, and loss

**1. Observed in iiko**

iiko documentation shows gross and net ingredient quantities, processing loss, finished output, recipe history, and recalculation of ingredient quantities for a requested output. It also warns that recipe validity dates affect historical write-off.

**2. General restaurant-domain lesson**

- USDA distinguishes `As Purchased` (AP) from `Edible Portion` (EP) and treats yield as a planning and food-cost control input.
- USDA recommends measured in-house yield when the operation consistently differs from reference averages.
- FAO treats yield as weight change during preparation/cooking and notes that yield may reflect either loss or gain.
- Institute of Child Nutrition guidance scales every ingredient by one common factor and determines actual batch yield by weighing the produced batch.
- Yield greater than 100% is possible when water is absorbed or ingredients are added. It is not automatically an error.

**3. Proposed MillQ design**

- A versioned `PreparationSpecification` stores expected inputs, expected output, process losses, preparation steps, and a scale basis.
- Creating a new specification version never changes old sales. Only a dedicated historical-error correction with permission, reason, and audit may change a historical reference and trigger replay.
- Scaling stores/applies one exact factor to the specification; it does not copy independently rounded ingredient rows.
- Expected output quantity is primary. Expected yield is derived when its comparison basis is meaningful:

  `expectedYield = expectedOutput / expectedComparableInput`

- For multi-ingredient or cross-dimensional preparations, the system must not invent a single mass-balance percentage. It preserves each input and output and labels the basis of any yield metric.
- Expected loss and actual loss remain distinct. Negative loss (weight gain) is valid when the process explains it.
- Planning cost uses expected output. Actual batch cost uses actual output.
- Normal loss within normative tolerance needs no comment. Material deviation is highlighted and may require a comment at a configured explanation threshold. Accident, total batch loss, or unusual write-off requires a reason, narrow permission, and immutable audit history.

**4. Vietnam-specific implication**

Local ingredients, supplier trimming, humidity, and kitchen technique may differ from imported yield tables. MillQ should support restaurant-specific yield studies and Vietnamese/Russian labels rather than treating external tables as operational truth.

**5. Legal/accounting verification required**

- Determine whether any official Vietnamese recipe/food-production records prescribe fields, units, or retention periods.
- Do not implement such forms until verified.

**6. Product Owner decision / review status**

- Fixed: normal normative loss needs no comment; configured material deviation is highlighted; accident/total/unusual loss requires reason, permission, and audit.
- Fixed: a new recipe/preparation version never recalculates old sales by itself.
- Accept expected output as the primary denominator for normative unit cost.
- Accept actual output as the primary denominator for actual batch unit cost.
- Accept yield above 100% and explicitly based yield metrics.

**7. Deferred question**

- Yield alert thresholds, statistical baselines, and approval workflow.
- Nutrition retention is separate from inventory costing.
- By-product allocation is architecturally allowed but deferred.

### 4.4 Normative preparation versus actual production

**1. Observed in iiko**

Public iiko manuals distinguish recipe-based ingredient write-off from storing a prepared dish/preparation produced by a preparation act. They also expose recipe history and practical preparation/yield records.

**2. General restaurant-domain lesson**

A standard recipe answers "what should happen". A production record answers "what did happen". Combining them destroys the ability to measure yield variance and can write off the same ingredients twice.

**3. Proposed MillQ design**

- `PreparationSpecification`: immutable versioned norm.
- `ProductionBatch`: actual event referencing one specification version, with actual inputs, actual outputs, waste/loss, responsible employee, warehouse, and timestamps.
- Initial actual batch material cost:

  `batchMaterialCost = sum(actual input movement costs)`

  `actualOutputUnitCost = batchMaterialCost / actual primary output quantity`

- If actual output is zero, no unit cost is produced; the input cost is a total batch loss requiring reason, narrow permission, and immutable audit history.
- Virtual preparation: sale recursively expands the preparation to leaf ingredients; no preparation stock is created.
- Stock-tracked preparation: production consumes ingredients once and creates preparation stock; later sale consumes that stock and must not recursively consume the ingredients again.
- The chosen materialization mode is part of the recipe/preparation version and the resulting write-off path is auditable.

**4. Vietnam-specific implication**

Restaurant-specific production practices and staff language affect workflow, not the core cost formula. Material-only cost remains the launch recommendation until local accounting policy is verified.

**5. Legal/accounting verification required**

IAS 2 and Vietnam accounting guidance can include conversion costs in inventory cost. A local accountant must confirm when labour, production overhead, freight, non-refundable tax, and normal/abnormal loss enter official inventory value.

**6. Product Owner decision required**

- Accept material-only preparation cost for the first operating chain.
- Accept explicit virtual versus stock-tracked mode and the no-double-write-off invariant.
- Accept zero-output handling as loss requiring a reason.

**7. Deferred question**

- Labour/overhead allocation.
- Multiple outputs and by-product cost allocation.
- Rework and batch genealogy beyond the first chain.

### 4.5 Moving weighted average and warehouse scope

**1. Observed in iiko**

Public iiko manuals show warehouse-specific cost. Under weighted average, existing carrying value plus receipt value is divided by the resulting quantity. Prepared stock can be valued like purchased stock, while a recursively written-off dish derives cost from ingredients.

**2. General restaurant-domain lesson**

- IAS 2 permits weighted average for ordinarily interchangeable inventory.
- A perpetual restaurant ledger needs moving average after each relevant inbound movement, not only a period-end average.
- Averaging across warehouses hides the actual cost of the warehouse from which stock was consumed.
- The source of truth should be quantity plus carrying value; rounded unit cost is a derived rate.

**3. Proposed MillQ design**

Cost state is scoped by:

`warehouse + stockItem + valuationCurrency`

For positive stock and an inbound movement:

`newQuantity = oldQuantity + inboundQuantity`

`newCarryingValue = oldCarryingValue + inboundCost`

`newAverage = newCarryingValue / newQuantity`

For an outbound movement fully covered by positive stock:

`issueCost = outboundQuantity × currentAverage`

`newQuantity = oldQuantity - outboundQuantity`

`newCarryingValue = oldCarryingValue - issueCost`

The calculation uses unrounded carrying value. Unit cost is derived. A zero quantity forces zero carrying value via final-issue residue assignment.

**4. Vietnam-specific implication**

Vietnam's Ministry of Finance material publicly lists weighted average among inventory valuation methods. Whether MillQ's perpetual moving implementation and its correction timing satisfy a particular entity's current accounting policy still requires local verification.

**5. Legal/accounting verification required**

- Confirm moving/perpetual weighted average is acceptable for each launch legal entity and consistently applied.
- Confirm which purchase, freight, tax, and production costs form the inbound cost basis.
- Confirm period-close and correction presentation.

**6. Product Owner decision required**

- Accept per-warehouse moving weighted average.
- Accept quantity and carrying value, rather than rounded unit cost, as the replay state.

**7. Deferred question**

- Cross-warehouse transfer costing and cross-legal-entity transfer pricing belong to later blocks.
- Net realisable value and accounting provisions are not part of the operational first chain.

### 4.6 Negative stock, chronology, and recalculation

**1. Observed in iiko**

iiko publicly allows negative stock. Its manuals describe correcting earlier negative-stock issues when later stock arrives so the remaining positive stock is not distorted. This is an observed iiko behavior, not a MillQ rule: Product Owner explicitly rejected automatic historical repricing by a genuinely later receipt. The manuals also illustrate why warehouse documents need real chronology and why recipe validity matters.

**2. General restaurant-domain lesson**

- Negative stock is an operational warning; the sale must use only knowledge that existed at its real business position.
- Naively keeping `-5 × old cost` and then adding `10 × new cost` creates an incorrect cost for the five real units left.
- A late-entered historical receipt can change later derived cost; a genuinely new later receipt cannot.
- A new recipe/preparation version is not a historical correction and cannot change old sales.
- Recalculation must be deterministic, restartable, and auditable.

**3. Proposed MillQ design**

- Quantity may go below zero and is always visibly flagged.
- The deficit part of an issue uses the last known warehouse cost at that business position and is labeled `ESTIMATED_FROM_LAST_KNOWN`; if none exists, cost is `UNKNOWN`.
- Positive carrying value never becomes a negative inventory asset. Deficits are tracked separately from positive carrying value.
- A genuinely later inbound resolves deficit quantity without revising earlier issue cost. Remaining real stock is valued at receipt cost. When the earlier issue has an estimated value, the difference for resolved quantity is a current auditable `NegativeStockResolutionDelta`; if the earlier cost was `UNKNOWN`, the delta remains `UNRESOLVED`. Its official accounting destination remains a verification gate.
- A late-entered or corrected fact that actually precedes the issue is inserted at its real business position and triggers replay from there.
- Costing order is `businessOccurredAt`, then immutable `businessOrder`. Server arrival, upload, database insertion, and synchronization order are audit data only and never costing tie-breakers.
- If same-time cross-device business order is unresolved, cost status is `ORDER_UNRESOLVED`; the system does not silently use technical order.
- A preorder creates no movement and fixes no cost; cost is determined at actual sale/write-off.
- A new recipe/preparation version never triggers historical replay by itself; a dedicated historical-error correction may do so with permission, reason, and audit.
- Each recalculation run records trigger, requested range, algorithm version, status, affected movements, previous/new values, and totals/hash needed to prove the run.
- Reports default to the latest successful calculation revision while retaining access to the originally calculated value and revision history.

**4. Vietnam-specific implication**

Backdated supplier paperwork can occur operationally, but its treatment across a closed Vietnamese accounting period is not inferred. The architecture preserves facts and revisions so a verified policy can be applied later.

**5. Legal/accounting verification required**

- Whether backdated operational facts may revise official prior-period cost or require a current-period adjustment.
- Required evidence, approvals, cutoff dates, and retention for corrections.
- Whether unresolved negative stock may remain at period close.

**6. Product Owner decision / review status**

- Fixed: business chronology outranks technical recording/upload order and must survive offline synchronization.
- Fixed: late-entered historical facts trigger affected replay; genuinely later facts do not rewrite earlier sales.
- Fixed: negative-stock sale uses the last known cost at its business position.
- Fixed: preorder creates no inventory cost or write-off.
- Accept visible `ESTIMATED_FROM_LAST_KNOWN`/`UNKNOWN`/`ORDER_UNRESOLVED` states.
- Accept current `NegativeStockResolutionDelta` as the non-retroactive consequence of a genuinely later receipt, with official accounting mapping deferred.
- Accept latest-revision reporting as the operational default, with full history retained.
- Decide whether backdating is permitted past an operationally closed period; legal posting remains separately gated.

**7. Deferred question**

- Exact document state machine, concurrency locks, idempotency, checkpoints, and dependency scheduling belong to Block C.
- Closed-period accounting corrections need a dedicated verified policy.

## 5. Options considered

### 5.1 Numeric representation

| Option | Benefits | Risks | Result |
| --- | --- | --- | --- |
| JavaScript `number` + PostgreSQL floating point | Simple and fast | Binary rounding, unsafe large integers, non-reproducible money drift | Rejected |
| Integer minor units for everything | Exact posted money | Cannot represent fractional unit costs/yields without awkward rational structures | Rejected as a complete model |
| Arbitrary decimal for everything | Uniform mental model | Posted money can accidentally retain illegal fractions; boundaries less explicit | Not preferred |
| Integer posted money + exact decimal quantities/rates/cost | Explicit boundaries, exact totals, preserves fractional cost | More domain types and conversion discipline | Recommended |

### 5.2 Unit model

| Option | Benefits | Risks | Result |
| --- | --- | --- | --- |
| Free-text UoM and arbitrary factors | Fast setup | kg/L/piece mistakes, no dimensional safety | Rejected |
| One global unit per dimension only | Simple ledger | Poor purchasing and kitchen usability | Rejected |
| Immutable item base unit + typed/versioned conversions and packages | Safe ledger and practical entry | Requires governance and migration for mistakes | Recommended |

### 5.3 Negative-stock valuation

| Option | Benefits | Risks | Result |
| --- | --- | --- | --- |
| Carry negative quantity and negative value into the next average | Simple formula | Distorts the value of real stock after receipt | Rejected |
| Always reprice a negative issue from the next receipt | Can align sale to covering purchase | Rewrites history with a fact that did not yet exist | Rejected by Product Owner |
| Use last known cost at sale; replay only genuine earlier facts; record later resolution delta now | Preserves real chronology and remaining-stock value | Requires explicit resolution delta and accounting mapping | Recommended |

### 5.4 Preparation handling

| Option | Benefits | Risks | Result |
| --- | --- | --- | --- |
| Always recursively expand | Simple recipe math | Cannot represent real produced stock or actual yield | Rejected |
| Always produce preparation stock | Strong batch traceability | Too heavy for virtual/nested prep | Rejected |
| Explicit virtual or stock-tracked mode per version | Supports both without double write-off | Requires mode discipline | Recommended |

## 6. Mandatory numerical invariants and examples

### A. Garlic: 1000 g raw to 825 g peeled

Input cost: `100000 VND`.

`normalizedCost = 100000 / 825 = 121.212121212121... VND/g`

The unit cost remains fractional internally. A 10 g use can later be valued without first rounding the unit rate to whole VND.

### B. Proportional garlic scale: 200 g raw to 165 g peeled

At the same purchase cost, 200 g raw costs `20000 VND`.

`normalizedCost = 20000 / 165 = 121.212121212121... VND/g`

It is identical to Example A.

For scale factor `s > 0`:

`scaledUnitCost = (s × inputCost) / (s × outputQuantity) = inputCost / outputQuantity`

Therefore proportional recipe scaling must not change normalized unit cost. MillQ preserves this by applying one scale factor to the specification and avoiding independent early rounding of ingredient rows.

### C. Actual preparation batch

Input material cost: `50000 VND`; actual output: `200 g`.

`actualOutputUnitCost = 50000 / 200 = 250 VND/g`

### D. Dish cost contribution

Dish consumes `10 g` of that tracked preparation.

`costContribution = 10 × 250 = 2500 VND`

### Additional properties required later

- Converting to a package and back produces the same base quantity within the declared 12-decimal quantum.
- Same-dimension conversions compose deterministically.
- Cross-dimension conversion without an item-specific rule is rejected.
- A proportional specification scale leaves normalized unit cost exactly unchanged for representable inputs.
- When stock returns to zero, carrying value returns exactly to zero.
- Replaying the same ordered movements produces the same quantity, carrying value, issue costs, and revision hash.
- A backdated receipt changes only derived costs and revisions, not immutable movement quantities or financial facts.
- A genuinely later receipt does not change an earlier sale cost.
- Reversing offline upload order does not change costing business order or result.
- A preorder creates no inventory movement or inventory cost.
- Creating a new recipe/preparation version does not change historical sales.
- Fixed packages convert to inventory units, while variable-weight packages post actual accepted quantity.
- Normal normative loss needs no comment; configured material deviation is highlighted; accident/total/unusual loss requires reason, permission, and audit.
- A stock-tracked preparation consumes inputs once; its later sale cannot recursively consume the same inputs.

## 7. Risks and controls

| Risk | Control proposed in Block A |
| --- | --- |
| Float drift | Domain decimals and API strings; reject `number` for domain values |
| VND display precision used as cost precision | Separate posted `Money` from fractional `CostValue` |
| Rounding policy invented globally | Versioned jurisdiction/context policy; dedicated Vietnam verification |
| Package edits rewrite history | Separate package/inventory unit; versioned fixed factor or actual variable-weight quantity |
| kg/L/piece mixed silently | Typed dimensions and item-specific cross-dimension conversion |
| Recipe scaling changes food cost | One scale factor; no independent early rounding |
| Norm replaces actual production | Separate specification and batch records |
| Double write-off | Explicit virtual vs stock-tracked materialization mode |
| Negative stock hides uncertainty | Visible negative balance and estimated/unknown cost status |
| Future receipt rewrites history or distorts remaining stock | Keep earlier sale cost; value remainder at receipt cost; record current resolution delta |
| Offline upload order changes cost | Persist business order; unresolved conflicts never fall back to server time |
| New recipe version rewrites old sales | Historical version reference is immutable absent dedicated correction workflow |
| Backdated edit silently rewrites history | Immutable facts + append-only calculation revisions and run audit |
| Legal/accounting policy invented | Dedicated Vietnam verification gates listed in both ADRs |

## 8. Product Owner decisions incorporated in revision 2

The following directions are authoritative inputs. The ADRs remain Proposed until their revised wording is independently reviewed and accepted:

1. Business chronology outranks technical recording/upload order; offline synchronization must preserve it.
2. Late-entered historical facts trigger affected replay.
3. Genuinely later receipts do not rewrite earlier sales; negative sales use last known cost at their business position.
4. Preorders create no inventory cost or write-off.
5. Supplier package and inventory unit are different; variable-weight packages store actual accepted quantity.
6. `COUNT`/`ea` is limited to products genuinely consumed as whole pieces.
7. Loss controls are severity-based: normative, material deviation, accident/total/unusual.
8. A new recipe/preparation version never recalculates old sales by itself.
9. No universal legally significant rounding rule is defined before jurisdiction-specific approval.

### Remaining architecture acceptance items

1. Exact money/decimal types and internal cost precision from ADR-0002.
2. One valuation currency per inventory ledger.
3. Mass/volume/count dimensions and immutable inventory base unit.
4. Expected versus actual yield and material-only first-chain preparation cost.
5. Virtual versus stock-tracked preparation and no-double-write-off invariant.
6. Per-warehouse moving weighted average and quantity/carrying-value replay state.
7. `NegativeStockResolutionDelta` as a current operational delta, with official accounting mapping deferred.
8. Latest successful cost revision as operational report default while preserving history.
9. Whether operational backdating may cross a closed period; official accounting treatment remains blocked on local verification.

### Change list from independent review

1. Removed universal ties-away-from-zero official-money rounding.
2. Separated `Package` from `InventoryUnit` and added fixed-package examples.
3. Added mandatory actual quantity for variable-weight packages.
4. Restricted `COUNT`/`ea` to genuinely piece-consumed products.
5. Replaced next-receipt historical repricing with last-known-at-sale cost plus current resolution delta.
6. Split late-entered historical facts from genuinely later facts.
7. Replaced server posting sequence with `businessOccurredAt + businessOrder` and prohibited technical fallback.
8. Added preorder no-write-off/no-cost rule.
9. Prevented new recipe/preparation versions from changing historical sales.
10. Added severity-based production-loss explanation, permission, and audit rules.

## 9. Deliberately deferred

- Restaurant feature code and database migrations.
- Exact decimal, ORM, migration, and test libraries.
- Document state machine, locks, idempotency, and offline reconciliation.
- Tax, fiscal/e-invoice, and cash denomination rules.
- Foreign-exchange gains/losses and source selection.
- Labour and production-overhead allocation.
- Multi-output/by-product cost allocation.
- Transfer pricing and cross-legal-entity inventory.
- Yield anomaly thresholds and approval workflows.

## 10. Sources

Accessed 2026-08-06.

### iiko public sources

- [iikoMini: menu, products, packages, preparations, and recipe versions](https://mini.iiko.help/ru/iikoWeb/menu%26prices2)
- [iikoOffice 7.1 user guide: warehouse costing and negative stock](https://ru.iiko.help/resources/Storage/archive/PDF/RU_iikoOffice_7.1.pdf)
- [iikoOffice 3.3 user guide: gross/net input, loss, output, preparation records, and recipe history](https://ru.iiko.help/resources/Storage/archive/PDF/UG_iikoOffice_3.3.pdf)
- [iikoChain 7.8 user guide: warehouse-scoped weighted-average behavior](https://ru.iiko.help/resources/Storage/archive/PDF/RU_iikoChain_7.8.pdf)

### Chef-technologist and food-production sources

- [USDA Food Buying Guide: AP/EP yield, in-house studies, production planning, and food-cost control](https://foodbuyingguide.fns.usda.gov/Home/About)
- [Institute of Child Nutrition: Step-by-Step Recipe Standardization Guide](https://theicn.org/resources/2539/step-by-step-recipe-standardization-guide-for-the-cacfp/127246/step-by-step-recipe-standardization-guide-for-the-cacfp.pdf)
- [Institute of Child Nutrition: recipe factor method](https://theicn.org/resources/117/orientation-to-school-nutrition-management/107019/food-production-and-operation-management-participants-workbook-for-orientation.pdf)
- [FAO: calculation of dishes prepared from recipes](https://www.fao.org/4/y4705e/y4705E23.htm)
- [FAO: restaurants, catering, and preparation loss](https://www.fao.org/flw-in-fish-value-chains/value-chain/retail/restaurants-and-catering/en/)

### Numerical, currency, measurement, and accounting sources

- [ECMA-262: ECMAScript Number and BigInt types](https://262.ecma-international.org/16.0/)
- [PostgreSQL: exact numeric types](https://www.postgresql.org/docs/current/datatype-numeric.html)
- [ISO 4217 overview and maintenance](https://www.iso.org/iso-4217-currency-codes.html)
- [SIX: official ISO 4217 maintenance data](https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html)
- [BIPM: International System of Units](https://www.bipm.org/en/publications/si-brochure)
- [IFRS Foundation: IAS 2 Inventories](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/)
- [Vietnam Ministry of Finance legal database: inventory accounting guidance](https://vbpl.moj.gov.vn/botaichinh/Pages/vbpq-toanvan.aspx?ItemID=66801&dvid=281)
