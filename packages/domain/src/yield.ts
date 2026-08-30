import { parseCanonicalDecimal, toCanonicalDecimal } from './decimal.js';
import {
  computeUnitCost,
  createCostValue,
  moneyToCostValue,
  roundCostValue,
  type CostValue,
} from './cost-value.js';
import type { Money } from './money.js';
import { InvalidDecimalError } from './errors.js';

/**
 * Yield / preparation cost inputs use CostValue (internal derived cost),
 * not posted Money currency quantum (ADR-0002 / ADR-0003).
 */
export type YieldNormalizationInput = {
  readonly inputQuantity: string;
  readonly outputQuantity: string;
  readonly totalInputCost: CostValue;
};

export type YieldNormalizationResult = {
  readonly unitCost: CostValue;
  readonly scaleInvariant: boolean;
};

/**
 * ADR-0003 garlic example: normalized unit cost must stay identical under proportional scaling.
 * (s × inputCost) / (s × outputQty) = inputCost / outputQty
 *
 * Scaling must use CostValue precision — never round a scaled derived cost back to integer Money.
 */
export function normalizeYieldUnitCost(input: YieldNormalizationInput): YieldNormalizationResult {
  const outQty = parseCanonicalDecimal(input.outputQuantity);
  if (outQty.isZero()) {
    throw new InvalidDecimalError('Output quantity cannot be zero for unit cost normalization');
  }
  parseCanonicalDecimal(input.inputQuantity);
  const unitCost = computeUnitCost(input.totalInputCost, input.outputQuantity);
  return { unitCost, scaleInvariant: true };
}

/** Convenience: posted Money converted once to CostValue, then normalized. */
export function normalizeYieldUnitCostFromMoney(
  inputQuantity: string,
  outputQuantity: string,
  totalInputCost: Money,
): YieldNormalizationResult {
  return normalizeYieldUnitCost({
    inputQuantity,
    outputQuantity,
    totalInputCost: moneyToCostValue(totalInputCost),
  });
}

export function verifyProportionalScaleInvariant(
  base: YieldNormalizationInput,
  scaleFactor: string,
): boolean {
  const s = parseCanonicalDecimal(scaleFactor);
  if (s.lte(0)) {
    throw new InvalidDecimalError('Scale factor must be positive');
  }
  const baseResult = normalizeYieldUnitCost(base);
  const scaledInputQty = parseCanonicalDecimal(base.inputQuantity).mul(s);
  const scaledOutputQty = parseCanonicalDecimal(base.outputQuantity).mul(s);
  const scaledCostExact = parseCanonicalDecimal(base.totalInputCost.amountMinorUnits).mul(s);
  const scaled: YieldNormalizationInput = {
    inputQuantity: toCanonicalDecimal(scaledInputQty),
    outputQuantity: toCanonicalDecimal(scaledOutputQty),
    totalInputCost: roundCostValue(
      scaledCostExact,
      base.totalInputCost.currencyCode,
      base.totalInputCost.minorUnitExponent,
    ),
  };
  const scaledResult = normalizeYieldUnitCost(scaled);
  return baseResult.unitCost.amountMinorUnits === scaledResult.unitCost.amountMinorUnits;
}

export function computeActualBatchUnitCost(
  actualInputCost: CostValue | Money,
  actualOutputQuantity: string,
): CostValue | null {
  const outQty = parseCanonicalDecimal(actualOutputQuantity);
  if (outQty.isZero()) {
    return null;
  }
  const cost: CostValue =
    'amountMinorUnits' in actualInputCost
      ? actualInputCost
      : moneyToCostValue(actualInputCost);
  return computeUnitCost(cost, actualOutputQuantity);
}

export function costValueFromMinor(amountMinorUnits: string, currencyCode: string, minorUnitExponent: number): CostValue {
  return createCostValue(amountMinorUnits, currencyCode, minorUnitExponent);
}
