import { parseCanonicalDecimal } from './decimal.js';
import { computeUnitCost, moneyToCostValue, type CostValue } from './cost-value.js';
import type { Money } from './money.js';
import { InvalidDecimalError } from './errors.js';

export type YieldNormalizationInput = {
  readonly inputQuantity: string;
  readonly outputQuantity: string;
  readonly totalInputCost: Money;
};

export type YieldNormalizationResult = {
  readonly unitCost: CostValue;
  readonly scaleInvariant: boolean;
};

/**
 * ADR-0003 garlic example: normalized unit cost must stay identical under proportional scaling.
 * (s × inputCost) / (s × outputQty) = inputCost / outputQty
 */
export function normalizeYieldUnitCost(input: YieldNormalizationInput): YieldNormalizationResult {
  const inQty = parseCanonicalDecimal(input.inputQuantity);
  const outQty = parseCanonicalDecimal(input.outputQuantity);
  if (outQty.isZero()) {
    throw new InvalidDecimalError('Output quantity cannot be zero for unit cost normalization');
  }
  const totalCost = moneyToCostValue(input.totalInputCost);
  const unitCost = computeUnitCost(totalCost, input.outputQuantity);
  return { unitCost, scaleInvariant: true };
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
  const scaledCostMinor = parseCanonicalDecimal(base.totalInputCost.amountMinor).mul(s);
  const scaled: YieldNormalizationInput = {
    inputQuantity: scaledInputQty.toFixed(),
    outputQuantity: scaledOutputQty.toFixed(),
    totalInputCost: {
      ...base.totalInputCost,
      amountMinor: scaledCostMinor.toFixed(0),
    },
  };
  const scaledResult = normalizeYieldUnitCost(scaled);
  return baseResult.unitCost.amountMinorUnits === scaledResult.unitCost.amountMinorUnits;
}

export function computeActualBatchUnitCost(
  actualInputCost: Money,
  actualOutputQuantity: string,
): CostValue | null {
  const outQty = parseCanonicalDecimal(actualOutputQuantity);
  if (outQty.isZero()) {
    return null;
  }
  return computeUnitCost(moneyToCostValue(actualInputCost), actualOutputQuantity);
}
