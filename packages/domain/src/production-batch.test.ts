import { describe, expect, it } from 'vitest';
import {
  assertDeviationRules,
  computeActualYieldRatio,
  computeYieldVariance,
} from './production-batch.js';
import { DomainError, IncompatibleUnitError } from './errors.js';

describe('production batch yield', () => {
  it('actual yield 1 kg input → 800 g output = 0.8', () => {
    expect(
      computeActualYieldRatio({
        inputQuantity: '1',
        inputUnit: 'kg',
        inputDimension: 'MASS',
        outputQuantity: '800',
        outputUnit: 'g',
        outputDimension: 'MASS',
      }),
    ).toBe('0.8');
  });

  it('yield variance actual 0.8 vs expected 0.9 = -0.1', () => {
    expect(computeYieldVariance('0.9', '0.8')).toBe('-0.1');
  });

  it('rejects MASS → VOLUME actual yield', () => {
    expect(() =>
      computeActualYieldRatio({
        inputQuantity: '1',
        inputUnit: 'kg',
        inputDimension: 'MASS',
        outputQuantity: '1',
        outputUnit: 'L',
        outputDimension: 'VOLUME',
      }),
    ).toThrow(IncompatibleUnitError);
  });
});

describe('production deviation rules', () => {
  it('NORMAL allows positive output without reason', () => {
    expect(() =>
      assertDeviationRules({
        deviationClass: 'NORMAL',
        deviationReason: null,
        actualOutputQuantity: '1',
      }),
    ).not.toThrow();
  });

  it('ACCIDENT requires reason', () => {
    expect(() =>
      assertDeviationRules({
        deviationClass: 'ACCIDENT',
        deviationReason: '',
        actualOutputQuantity: '1',
      }),
    ).toThrow(DomainError);
  });

  it('TOTAL_LOSS requires reason and zero output', () => {
    expect(() =>
      assertDeviationRules({
        deviationClass: 'TOTAL_LOSS',
        deviationReason: 'spilled',
        actualOutputQuantity: '0',
      }),
    ).not.toThrow();
    expect(() =>
      assertDeviationRules({
        deviationClass: 'TOTAL_LOSS',
        deviationReason: 'spilled',
        actualOutputQuantity: '1',
      }),
    ).toThrow(DomainError);
    expect(() =>
      assertDeviationRules({
        deviationClass: 'TOTAL_LOSS',
        deviationReason: '',
        actualOutputQuantity: '0',
      }),
    ).toThrow(DomainError);
  });

  it('rejects zero output for NORMAL production', () => {
    expect(() =>
      assertDeviationRules({
        deviationClass: 'NORMAL',
        deviationReason: null,
        actualOutputQuantity: '0',
      }),
    ).toThrow(DomainError);
  });
});
