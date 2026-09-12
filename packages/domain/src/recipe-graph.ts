import { DomainError, InvalidDecimalError } from './errors.js';
import { parseCanonicalDecimal, toCanonicalDecimal } from './decimal.js';
import { createQuantity, type Quantity, type UnitDimension } from './quantity.js';

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

export type NormativeYieldInput = {
  readonly inputQuantity: string;
  readonly inputUnit: string;
  readonly inputDimension: UnitDimension;
  readonly outputQuantity: string;
  readonly outputUnit: string;
  readonly outputDimension: UnitDimension;
};

/**
 * expectedYield = expectedOutput / expectedComparableInput when units+dimensions match (ADR-0003).
 * Does not invent a yield when dimensions/units are incompatible.
 */
export function computeNormativeYieldRatio(input: NormativeYieldInput): string {
  const inQty = createQuantity(input.inputQuantity, input.inputDimension, input.inputUnit);
  const outQty = createQuantity(input.outputQuantity, input.outputDimension, input.outputUnit);
  if (inQty.dimension !== outQty.dimension || inQty.unit !== outQty.unit) {
    throw new InvalidDecimalError(
      `Normative yield requires matching unit/dimension (input ${inQty.unit}/${inQty.dimension} vs output ${outQty.unit}/${outQty.dimension})`,
    );
  }
  const denom = parseCanonicalDecimal(inQty.value);
  if (denom.isZero()) {
    throw new InvalidDecimalError('Normative input quantity cannot be zero for yield');
  }
  const numer = parseCanonicalDecimal(outQty.value);
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
  if (!s.gt(0)) {
    throw new InvalidDecimalError('Batch scale factor must be positive');
  }
  return components.map((c) => {
    const q = createQuantity(c.quantity, c.dimension, c.unit);
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
  if (!s.gt(0)) {
    throw new InvalidDecimalError('Batch scale factor must be positive');
  }
  const scaledBatchValue = parseCanonicalDecimal(baseBatch.value).mul(s);
  const scaledBatch = createQuantity(
    toCanonicalDecimal(scaledBatchValue),
    baseBatch.dimension,
    baseBatch.unit,
  );
  const scaledComponents = scaleComponentsForBatch(baseComponents, scaleFactor);
  const baseSize = parseCanonicalDecimal(baseBatch.value);
  const scaledSize = parseCanonicalDecimal(scaledBatch.value);
  if (baseSize.isZero() || scaledSize.isZero()) {
    throw new InvalidDecimalError('Batch size cannot be zero');
  }
  for (let i = 0; i < baseComponents.length; i++) {
    const base = baseComponents[i]!;
    const scaled = scaledComponents[i]!;
    const baseRatio = parseCanonicalDecimal(base.quantity).div(baseSize);
    const scaledRatio = parseCanonicalDecimal(scaled.quantity).div(scaledSize);
    if (!baseRatio.eq(scaledRatio)) return false;
  }
  return true;
}
