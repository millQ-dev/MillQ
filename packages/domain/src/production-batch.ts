import { parseCanonicalDecimal, toCanonicalDecimal } from './decimal.js';
import { DomainError } from './errors.js';
import {
  computeNormativeYieldRatio,
  type NormativeYieldInput,
} from './recipe-graph.js';

/**
 * Actual yield uses the same comparable-basis formula as normative yield (ADR-0003):
 * actualYield = actualOutput / actualComparableInput after accepted unit normalization.
 */
export function computeActualYieldRatio(input: NormativeYieldInput): string {
  return computeNormativeYieldRatio(input);
}

/**
 * yieldVariance = actualYield − expectedYield (canonical decimal difference).
 * Threshold/policy for MATERIAL_DEVIATION is intentionally not invented here.
 */
export function computeYieldVariance(expectedYield: string, actualYield: string): string {
  const expected = parseCanonicalDecimal(expectedYield);
  const actual = parseCanonicalDecimal(actualYield);
  return toCanonicalDecimal(actual.sub(expected));
}

export type ProductionDeviationClass =
  | 'NORMAL'
  | 'MATERIAL_DEVIATION'
  | 'ACCIDENT'
  | 'TOTAL_LOSS';

/**
 * Domain rules for deviation reason / zero-output exceptional path.
 * Does not invent a numeric deviation threshold.
 */
export function assertDeviationRules(input: {
  readonly deviationClass: ProductionDeviationClass;
  readonly deviationReason: string | null | undefined;
  readonly actualOutputQuantity: string;
}): void {
  const reason = input.deviationReason?.trim() ?? '';
  if (
    (input.deviationClass === 'ACCIDENT' || input.deviationClass === 'TOTAL_LOSS') &&
    reason.length === 0
  ) {
    throw new DomainError(
      'DEVIATION_REASON_REQUIRED',
      `${input.deviationClass} requires a non-empty deviation reason`,
    );
  }

  const out = parseCanonicalDecimal(input.actualOutputQuantity);
  if (input.deviationClass === 'TOTAL_LOSS') {
    if (!out.isZero()) {
      throw new DomainError(
        'TOTAL_LOSS_OUTPUT_MUST_BE_ZERO',
        'TOTAL_LOSS requires explicit zero actual output quantity',
      );
    }
    return;
  }

  if (out.lte(0)) {
    throw new DomainError(
      'POSITIVE_OUTPUT_REQUIRED',
      'Actual output must be positive for non-TOTAL_LOSS production batches',
    );
  }
}
