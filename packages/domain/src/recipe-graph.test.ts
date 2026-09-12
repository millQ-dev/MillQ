import { describe, expect, it } from 'vitest';
import {
  assertAcyclicComposition,
  assertPositiveQuantity,
  batchScalePreservesUnitRatios,
  computeNormativeYieldRatio,
  findCompositionCycle,
  normalizeToBaseUnit,
  scaleComponentsForBatch,
} from './recipe-graph.js';
import { createQuantity } from './quantity.js';
import { DomainError, IncompatibleUnitError, InvalidDecimalError } from './errors.js';

describe('recipe composition graph', () => {
  it('rejects direct self-cycle A → A', () => {
    const adj = new Map<string, string[]>([['A', ['A']]]);
    expect(findCompositionCycle(adj)).toEqual(['A', 'A']);
    expect(() => assertAcyclicComposition(adj)).toThrow(DomainError);
  });

  it('rejects two-node cycle A → B → A', () => {
    const adj = new Map<string, string[]>([
      ['A', ['B']],
      ['B', ['A']],
    ]);
    expect(findCompositionCycle(adj)?.slice(0, 3)).toEqual(['A', 'B', 'A']);
  });

  it('rejects deeper cycle A → B → C → A', () => {
    const adj = new Map<string, string[]>([
      ['A', ['B']],
      ['B', ['C']],
      ['C', ['A']],
    ]);
    expect(findCompositionCycle(adj)).toEqual(['A', 'B', 'C', 'A']);
  });

  it('accepts acyclic nested graph', () => {
    const adj = new Map<string, string[]>([
      ['A', ['B', 'C']],
      ['B', ['D']],
      ['C', []],
      ['D', []],
    ]);
    expect(findCompositionCycle(adj)).toBeNull();
    expect(() => assertAcyclicComposition(adj)).not.toThrow();
  });
});

describe('normative yield', () => {
  it('1000 g -> 800 g = 0.8', () => {
    expect(
      computeNormativeYieldRatio({
        inputQuantity: '1000',
        inputUnit: 'g',
        inputDimension: 'MASS',
        outputQuantity: '800',
        outputUnit: 'g',
        outputDimension: 'MASS',
      }),
    ).toBe('0.8');
  });

  it('1 kg -> 800 g = 0.8', () => {
    expect(
      computeNormativeYieldRatio({
        inputQuantity: '1',
        inputUnit: 'kg',
        inputDimension: 'MASS',
        outputQuantity: '800',
        outputUnit: 'g',
        outputDimension: 'MASS',
      }),
    ).toBe('0.8');
  });

  it('800 g -> 1 kg input reverse-compatible units = 0.8', () => {
    expect(
      computeNormativeYieldRatio({
        inputQuantity: '1',
        inputUnit: 'kg',
        inputDimension: 'MASS',
        outputQuantity: '0.8',
        outputUnit: 'kg',
        outputDimension: 'MASS',
      }),
    ).toBe('0.8');
  });

  it('rejects MASS -> VOLUME', () => {
    expect(() =>
      computeNormativeYieldRatio({
        inputQuantity: '1',
        inputUnit: 'kg',
        inputDimension: 'MASS',
        outputQuantity: '1',
        outputUnit: 'L',
        outputDimension: 'VOLUME',
      }),
    ).toThrow(IncompatibleUnitError);
  });

  it('normalizes kg to g base', () => {
    const q = normalizeToBaseUnit('1', 'kg', 'MASS');
    expect(q.value).toBe('1000');
    expect(q.unit).toBe('g');
  });
});

describe('batch size scale invariant', () => {
  it('preserves component/batch ratios under proportional scaling', () => {
    const batch = createQuantity('10', 'COUNT', 'ea');
    const components = [
      { lineNumber: 1, quantity: '2', unit: 'L', dimension: 'VOLUME' as const },
      { lineNumber: 2, quantity: '500', unit: 'g', dimension: 'MASS' as const },
    ];
    expect(batchScalePreservesUnitRatios(batch, components, '2')).toBe(true);
    const scaled = scaleComponentsForBatch(components, '2');
    expect(scaled[0]!.quantity).toBe('4');
    expect(scaled[1]!.quantity).toBe('1000');
  });
});

describe('positive quantity', () => {
  it('rejects zero and negative', () => {
    expect(() => assertPositiveQuantity('0', 'MASS', 'g', 'batch size')).toThrow(InvalidDecimalError);
    expect(() => assertPositiveQuantity('-1', 'MASS', 'g', 'batch size')).toThrow(InvalidDecimalError);
  });
});
