import { Decimal, assertNonNegative, parseCanonicalDecimal, toCanonicalDecimal, type DecimalValue } from './decimal.js';
import { InvalidDecimalError } from './errors.js';
import type { Money } from './money.js';

const COST_FRACTION_DIGITS = 12;

export type CostValue = {
  readonly amountMinorUnits: string;
  readonly currencyCode: string;
  readonly minorUnitExponent: number;
};

export function createCostValue(
  amountMinorUnits: string,
  currencyCode: string,
  minorUnitExponent: number,
): CostValue {
  parseCanonicalDecimal(amountMinorUnits);
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new InvalidDecimalError(`Invalid currency code: ${currencyCode}`);
  }
  return { amountMinorUnits, currencyCode, minorUnitExponent };
}

/** Persist internal cost at 12 sub-minor digits, ties to even (ADR-0002). */
export function roundCostValue(d: DecimalValue, currencyCode: string, minorUnitExponent: number): CostValue {
  const rounded = d.toDecimalPlaces(COST_FRACTION_DIGITS, Decimal.ROUND_HALF_EVEN);
  return createCostValue(toCanonicalDecimal(rounded), currencyCode, minorUnitExponent);
}

/** Unit cost = total material cost / output quantity. */
export function computeUnitCost(
  totalCost: CostValue,
  outputQuantity: string,
): CostValue {
  const cost = parseCanonicalDecimal(totalCost.amountMinorUnits);
  const qty = parseCanonicalDecimal(outputQuantity);
  assertNonNegative(qty, 'outputQuantity');
  if (qty.isZero()) {
    throw new InvalidDecimalError('Cannot compute unit cost for zero output quantity');
  }
  return roundCostValue(cost.div(qty), totalCost.currencyCode, totalCost.minorUnitExponent);
}

/** Material cost from money fact converted to cost coordinate (same minor unit, extended precision). */
export function moneyToCostValue(m: Money): CostValue {
  return createCostValue(m.amountMinor, m.currencyCode, m.minorUnitExponent);
}

export function costForQuantity(unitCost: CostValue, quantity: string): CostValue {
  const rate = parseCanonicalDecimal(unitCost.amountMinorUnits);
  const qty = parseCanonicalDecimal(quantity);
  return roundCostValue(rate.mul(qty), unitCost.currencyCode, unitCost.minorUnitExponent);
}
