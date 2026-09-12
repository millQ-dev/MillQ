import { DomainError, IncompatibleUnitError, InvalidDecimalError } from './errors.js';
import { assertPositive, parseCanonicalDecimal, toCanonicalDecimal } from './decimal.js';
import { BASE_UNITS, createQuantity, type Quantity, type UnitDimension } from './quantity.js';

/**
 * Detect directed cycles in a composition graph (preparation / recipe nesting).
 * Edges: nodeId → nested nodeIds.
 */
export function findCompositionCycle(
  adjacency: ReadonlyMap<string, readonly string[]>,
): string[] | null {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function dfs(node: string): string[] | null {
    if (visiting.has(node)) {
      const idx = stack.indexOf(node);
      return idx >= 0 ? [...stack.slice(idx), node] : [node, node];
    }
    if (visited.has(node)) return null;
    visiting.add(node);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      const cycle = dfs(next);
      if (cycle) return cycle;
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return null;
  }

  for (const node of adjacency.keys()) {
    const cycle = dfs(node);
    if (cycle) return cycle;
  }
  return null;
}

export function assertAcyclicComposition(adjacency: ReadonlyMap<string, readonly string[]>): void {
  const cycle = findCompositionCycle(adjacency);
  if (cycle) {
    throw new DomainError('COMPOSITION_CYCLE', `Composition cycle detected: ${cycle.join(' → ')}`);
  }
}

/**
 * Exact positive factors from common same-dimension units into ADR-0002 BASE_UNITS
 * (MASS→g, VOLUME→ml, COUNT→ea). Not a general conversion registry — SI-compatible only.
 */
const TO_BASE_FACTOR: Record<UnitDimension, Readonly<Record<string, string>>> = {
  MASS: { g: '1', kg: '1000' },
  VOLUME: { ml: '1', L: '1000' },
  COUNT: { ea: '1' },
};

export function factorToBaseUnit(unit: string, dimension: UnitDimension): string {
  const factor = TO_BASE_FACTOR[dimension][unit];
  if (!factor) {
    throw new IncompatibleUnitError(
      `No accepted conversion from unit '${unit}' to base ${BASE_UNITS[dimension]} for ${dimension}`,
    );
  }
  return factor;
}

/** Normalize a quantity into the dimension's BASE_UNITS using accepted SI factors. */
export function normalizeToBaseUnit(
  value: string,
  unit: string,
  dimension: UnitDimension,
): Quantity {
  const q = createQuantity(value, dimension, unit);
  const factor = factorToBaseUnit(q.unit, dimension);
  const baseValue = parseCanonicalDecimal(q.value).mul(parseCanonicalDecimal(factor));
  return createQuantity(toCanonicalDecimal(baseValue), dimension, BASE_UNITS[dimension]);
}

/**
 * True when `fromUnit` can be expressed in `toUnit` within the same dimension
 * via accepted SI factors (both convert to the same BASE_UNITS).
 */
export function assertSameDimensionCompatibleUnits(
  fromUnit: string,
  toUnit: string,
  dimension: UnitDimension,
): void {
  factorToBaseUnit(fromUnit, dimension);
  factorToBaseUnit(toUnit, dimension);
}

export type NormativeYieldInput = {
  readonly inputQuantity: string;
  readonly inputUnit: string;
  readonly inputDimension: UnitDimension;
  readonly outputQuantity: string;
  readonly outputUnit: string;
  readonly outputDimension: UnitDimension;
};

/**
 * expectedYield = expectedOutput / expectedComparableInput (ADR-0003).
 * Same-dimension compatible units are normalized to BASE_UNITS before division.
 * Cross-dimension remains rejected as IncompatibleUnitError.
 */
export function computeNormativeYieldRatio(input: NormativeYieldInput): string {
  if (input.inputDimension !== input.outputDimension) {
    throw new IncompatibleUnitError(
      `Normative yield requires same dimension (input ${input.inputDimension} vs output ${input.outputDimension})`,
    );
  }
  const inBase = normalizeToBaseUnit(input.inputQuantity, input.inputUnit, input.inputDimension);
  const outBase = normalizeToBaseUnit(
    input.outputQuantity,
    input.outputUnit,
    input.outputDimension,
  );
  const denom = parseCanonicalDecimal(inBase.value);
  if (denom.isZero()) {
    throw new InvalidDecimalError('Normative input quantity cannot be zero for yield');
  }
  const numer = parseCanonicalDecimal(outBase.value);
  return toCanonicalDecimal(numer.div(denom));
}

export type ScalableComponent = {
  readonly lineNumber: number;
  readonly quantity: string;
  readonly unit: string;
  readonly dimension: UnitDimension;
};

/**
 * Scale component quantities when batch size changes by scaleFactor.
 * Preserves per-batch normalized ratios (ADR-0002 §9 / ADR-0003 scale invariant direction).
 */
export function scaleComponentsForBatch(
  components: readonly ScalableComponent[],
  scaleFactor: string,
): ScalableComponent[] {
  const s = parseCanonicalDecimal(scaleFactor);
  assertPositive(s, 'Batch scale factor');
  return components.map((c) => {
    const q = createQuantity(c.quantity, c.dimension, c.unit);
    assertPositive(parseCanonicalDecimal(q.value), 'component quantity');
    const scaled = parseCanonicalDecimal(q.value).mul(s);
    return {
      ...c,
      quantity: toCanonicalDecimal(scaled),
    };
  });
}

/**
 * True when each component quantity / batchSize is unchanged under proportional batch scaling.
 */
export function batchScalePreservesUnitRatios(
  baseBatch: Quantity,
  baseComponents: readonly ScalableComponent[],
  scaleFactor: string,
): boolean {
  const s = parseCanonicalDecimal(scaleFactor);
  assertPositive(s, 'Batch scale factor');
  assertPositive(parseCanonicalDecimal(baseBatch.value), 'batch size');
  const scaledBatchValue = parseCanonicalDecimal(baseBatch.value).mul(s);
  const scaledBatch = createQuantity(
    toCanonicalDecimal(scaledBatchValue),
    baseBatch.dimension,
    baseBatch.unit,
  );
  const scaledComponents = scaleComponentsForBatch(baseComponents, scaleFactor);
  const baseSize = parseCanonicalDecimal(baseBatch.value);
  const scaledSize = parseCanonicalDecimal(scaledBatch.value);
  for (let i = 0; i < baseComponents.length; i++) {
    const base = baseComponents[i]!;
    const scaled = scaledComponents[i]!;
    const baseRatio = parseCanonicalDecimal(base.quantity).div(baseSize);
    const scaledRatio = parseCanonicalDecimal(scaled.quantity).div(scaledSize);
    if (!baseRatio.eq(scaledRatio)) return false;
  }
  return true;
}

/** Positive quantity required for recipe/preparation magnitudes (batch, component, normative I/O). */
export function assertPositiveQuantity(
  value: string,
  dimension: UnitDimension,
  unit: string,
  label: string,
): Quantity {
  const q = createQuantity(value, dimension, unit);
  assertPositive(parseCanonicalDecimal(q.value), label);
  return q;
}
