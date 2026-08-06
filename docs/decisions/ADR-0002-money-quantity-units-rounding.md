# ADR-0002: Money, Quantity, Units, and Rounding

- **Status:** Proposed
- **Date:** 2026-08-06
- **Decision owners:** Product Owner and System Architect
- **Related issue:** [#9 — Define money, units, yield and moving-average costing](https://github.com/millQ-dev/MillQ/issues/9)
- **Related analysis:** [`block-a-money-units-yield-costing-analysis.md`](../architecture/block-a-money-units-yield-costing-analysis.md)
- **Depends on:** [ADR-0001 — Initial technology stack](ADR-0001-initial-technology-stack.md)

## Context

MillQ will calculate prices, discounts, payments, quantities, yields, unit costs, inventory carrying value, and food cost in TypeScript and PostgreSQL. JavaScript `number` uses binary floating point and cannot safely represent all decimal fractions or large integer amounts. Currency display precision is also insufficient for a moving cost per gram: VND has no ISO minor fraction, but `100000 VND / 825 g` is a valid fractional internal unit cost.

The model must therefore distinguish:

- posted financial amounts that must respect a currency quantum;
- derived cost value that needs sub-minor allocation precision;
- quantities and conversion factors;
- rates such as price per unit, cost per unit, and yield.

This ADR does not define tax, fiscal/e-invoice, cash denomination, or foreign-exchange accounting rules.

## Decision

If accepted, the following rules are mandatory for all later schemas, APIs, calculations, and tests.

### 1. Domain arithmetic does not use JavaScript `number`

`Money`, `CostValue`, `Quantity`, `ConversionFactor`, `UnitPrice`, `UnitCost`, `Percentage`, and `Yield` must use exact integer/decimal domain types.

- JSON/REST fields are canonical decimal strings.
- PostgreSQL uses exact `numeric` columns or integer-constrained `numeric` columns.
- Binary floating-point values may be used only for non-authoritative UI visualization after conversion from the domain value.
- Exact TypeScript library selection is deferred to the concrete-stack decision, but it must implement the semantics in this ADR.

Canonical decimal strings:

- use ASCII digits and `.` as decimal separator;
- never use grouping separators or scientific notation;
- contain no redundant leading `+`;
- normalize negative zero to zero;
- retain scale only where the contract explicitly requires it.

### 2. Posted money and derived cost are distinct types

#### `Money`

A posted financial amount is:

`amountMinor + currencyCode + minorUnitExponent`

- `amountMinor` is a signed integer serialized as a string and stored as integer-constrained `NUMERIC(30, 0)`.
- `currencyCode` is an ISO 4217 alphabetic code.
- `minorUnitExponent` is captured on the fact so later reference-data changes cannot reinterpret history.
- A `Money` value cannot contain a fraction below its currency quantum.

Examples:

- `125000 VND` → amount minor `"125000"`, code `VND`, exponent `0`.
- `12.34 USD` → amount minor `"1234"`, code `USD`, exponent `2`.

#### `CostValue`

Derived inventory carrying value and issue cost use the currency's minor unit as coordinate but permit 12 additional decimal places:

- storage target: `NUMERIC(38, 12)` minor units;
- serialization: canonical decimal string;
- always paired with currency code and the applicable exponent context;
- not directly payable or printable as a closed commercial amount without conversion to `Money` at a named boundary.

This allows `121.212121... VND/g` to remain accurate without pretending that a customer can pay a fraction of a đồng.

### 3. Currency reference data is versioned

- ISO 4217 currency code, numeric code, minor-unit exponent, effective interval, and source version are reference data.
- Persisted financial facts capture code and exponent.
- VND is the Vietnam onboarding default and currently uses exponent `0`.
- ISO exponent controls currency quantum and default display, not legal cash rounding, tax rounding, or fiscal-invoice behavior.

### 4. One inventory ledger uses one valuation currency

- Moving average is never calculated across currencies.
- Every warehouse/item cost stream belongs to exactly one valuation currency.
- The owning entity and inheritance rules are decided in Block B.
- A foreign-currency purchase preserves original `Money`, conversion rate/source/time, and the resulting valuation-currency `Money` as separate facts.
- FX rate sourcing and gains/losses are deferred; an unapproved conversion cannot post inventory cost.

### 5. Rounding has named boundaries

No helper may expose a generic implicit `roundMoney()` or silently apply UI precision.

#### Posted commercial calculations

When MillQ itself must calculate a posted customer/supplier amount:

- calculate with exact decimal intermediates;
- round once at the specified line/document boundary to the currency quantum;
- rounding mode: nearest, ties away from zero;
- preserve the unrounded basis and applied rounding delta for audit where the result is financially material.

Imported/accepted source-document totals remain source facts and are not retrospectively recomputed after a rule change.

#### Allocation

When a fixed posted total must be split across lines:

1. calculate exact shares;
2. take each share toward zero to currency minor units;
3. distribute the remaining minor units by largest absolute remainder;
4. break equal remainders by a stable line sequence captured on the document.

The allocated lines must sum exactly to the posted total for positive and negative documents.

#### Internal costing

- compute with exact decimal intermediates;
- persist `CostValue` at 12 sub-minor digits using nearest, ties to even;
- do not round a unit cost for display and then reuse it in calculation;
- when stock quantity reaches zero, assign any remaining cost quantum to the final issue so carrying value also becomes exactly zero.

#### Display

Display formatting never changes the stored value. A screen or report may show fewer decimals but calculations always start from the stored domain value.

### 6. Quantity is exact and dimensioned

`Quantity` is stored in a stock item's base unit:

- storage target: `NUMERIC(38, 12)`;
- API representation: canonical decimal string;
- initial dimensions: `MASS`, `VOLUME`, `COUNT`;
- recommended canonical units: gram (`g`), millilitre (`ml`), each (`ea`).

Each stock item has one base unit. After its first posted movement, changing the base unit requires an explicit migration that preserves all historical base quantities and factors.

A count item can be marked `DISCRETE`. A discrete item rejects fractional base quantity.

### 7. Measurement precision is separate from storage precision

- Each usable input UoM has an operational measurement increment, such as 1 g, 0.1 g, 1 ml, or 1 ea.
- User input must be a multiple of that increment unless an explicitly authorized correction workflow says otherwise.
- Internal storage keeps 12 decimals so nested conversions and proportional calculations do not inherit UI/device rounding.
- The original entered value is preserved on posted facts.

### 8. UoM and package conversions are typed and versioned

- A conversion identifies source unit, target base unit, dimension, exact positive factor, effective interval/version, and source.
- Same-dimension conversion is allowed when configured.
- Cross-dimension conversion is rejected by default.
- Cross-dimension conversion requires an item-specific, versioned measured rule. MillQ never assumes water density for arbitrary products.
- A package is a purchasing/operational presentation containing an exact amount of the item's base unit.
- Editing package content creates a new version; it does not change posted documents.

Every posted line that uses a non-base unit captures:

- entered quantity and unit;
- conversion/package version;
- factor snapshot;
- calculated base quantity;
- quantization delta, if any.

### 9. Recipe scaling does not materialize rounded copies

A recipe/preparation version keeps normative quantities plus an exact scale basis. Asking for a different batch size applies one scale factor to all inputs and outputs during calculation. The system must not persist a new set of independently rounded ingredient rows merely because the requested batch size changed.

For positive scale `s`:

`(s × inputCost) / (s × outputQuantity) = inputCost / outputQuantity`

The normalized cost must therefore remain unchanged for every proportionally scaled, representable specification.

## Invariants

1. No authoritative domain calculation accepts or returns JavaScript `number`.
2. `Money.amountMinor` is integral and valid for the captured exponent.
3. Amounts with different currencies cannot be added, compared as money, or averaged without an explicit conversion fact.
4. Allocated line amounts sum exactly to their posted total.
5. `Quantity` conversions require compatible dimensions unless an item-specific rule exists.
6. Posted lines remain interpretable after package, unit, or currency reference data changes.
7. A discrete count item has integral base quantity.
8. Display rounding never feeds domain calculation.
9. Proportional recipe scaling never changes normalized unit cost.

## Alternatives considered

### JavaScript `number` and PostgreSQL floating point

Rejected. Binary floating point cannot provide the exact, replayable decimal behavior required for inventory and financial audit.

### Integer minor units for every numeric value

Rejected as a complete solution. It safely represents posted money but cannot naturally represent quantity, yield, package factors, or fractional unit cost.

### One arbitrary-decimal type for both posted money and calculation

Not selected. It is exact, but it makes the currency quantum an optional convention and increases the risk of posting illegal fractional money. Distinct types make the boundary enforceable.

### Globally fixed units with no packages

Rejected. It simplifies the ledger but makes receiving, inventory counting, and kitchen work impractical.

### Free-text units and implicit conversions

Rejected. It cannot prevent mass/volume/count corruption or preserve historical conversion meaning.

## Consequences

### Positive

- Reproducible calculation across API, backend, jobs, tests, and PostgreSQL.
- VND commercial amounts stay valid while unit cost can remain fractional.
- Historical facts survive reference-data and package changes.
- Dimensional validation prevents high-impact stock errors.
- Recipe scaling has a mathematical invariant rather than a UI convention.

### Negative / accepted cost

- Domain types and serializers require more code than primitive numbers.
- Developers must name every rounding boundary and cannot rely on database coercion.
- The UI must parse/format decimal strings.
- Package and conversion changes require versioning.
- Two cost precisions—posted money and derived carrying value—must be explained in reports.

## Validation plan

When implementation is authorized, tests must include:

1. Decimal serialization round-trip and negative-zero normalization.
2. Rejecting float input and overprecision at domain boundaries.
3. VND and two-/three-decimal currency examples.
4. Positive and negative largest-remainder allocation with stable ties.
5. `1 case × 12 bottles × 330 ml = 3960 ml` with factor snapshots.
6. Rejection of kg-to-L conversion without an item-specific rule.
7. Discrete count rejection of fractional each.
8. Package version change leaving historical lines unchanged.
9. Property-based proportional recipe scaling over positive decimal factors.
10. Database/application parity for every rounding mode.

## Owner/architect acceptance checklist

- [ ] Accept posted `Money` as integer minor units with captured ISO exponent.
- [ ] Accept derived `CostValue` with 12 sub-minor digits.
- [ ] Accept `NUMERIC(38, 12)` quantity and 18-decimal rate targets.
- [ ] Accept canonical decimal strings in REST/JSON.
- [ ] Accept ties-away-from-zero for system-calculated posted money.
- [ ] Accept ties-to-even at the 12-digit internal cost boundary.
- [ ] Accept largest-remainder allocation and stable tie-breaking.
- [ ] Accept one valuation currency per inventory ledger.
- [ ] Accept `MASS`/`VOLUME`/`COUNT`, immutable item base unit, and explicit package versions.
- [ ] Accept item-specific cross-dimension conversions only.
- [ ] Accept the no-early-rounding recipe scaling rule.

## Legal/accounting verification gates

Before production use in Vietnam, verify with current official sources and a qualified local accountant:

- accounting/functional currency rules;
- purchase-cost composition and foreign-currency translation;
- VAT/tax/fiscal invoice rounding boundaries;
- discount and surcharge rounding;
- cash denomination rounding;
- correction of posted/closed-period amounts.

No result of that verification is presumed by this ADR.

## Deferred decisions

- Exact TypeScript decimal library and SQL mapping.
- Default measurement increments by product category/device.
- Currency conversion provider and FX accounting.
- Tax/fiscal calculation and cash rounding.
- Permissions for changing unit/package reference data.
