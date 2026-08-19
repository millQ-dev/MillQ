import { describe, expect, it } from 'vitest';
import {
  createMoney,
  createQuantity,
  packageToBaseQuantity,
  variableWeightToBase,
  rejectCrossDimension,
  normalizeYieldUnitCost,
  verifyProportionalScaleInvariant,
  computeActualBatchUnitCost,
  IncompatibleUnitError,
  InvalidDecimalError,
} from './index.js';

describe('package conversion', () => {
  it('converts 6 × 1 L milk bottles to 6 L', () => {
    const q = packageToBaseQuantity(6, {
      packageId: 'milk-1l',
      versionId: 'v1',
      packCount: 1,
      unitQuantity: '1',
      unit: 'L',
      dimension: 'VOLUME',
      toBaseUnit: 'ml',
      factorPerUnit: '1000',
    });
    expect(q.value).toBe('6000');
    expect(q.unit).toBe('ml');
  });

  it('converts 3 × 400 g cans to 1.2 kg (1200 g)', () => {
    const q = packageToBaseQuantity(3, {
      packageId: 'tomato-can',
      versionId: 'v1',
      packCount: 1,
      unitQuantity: '400',
      unit: 'g',
      dimension: 'MASS',
      toBaseUnit: 'g',
      factorPerUnit: '1',
    });
    expect(q.value).toBe('1200');
  });

  it('accepts 12 eggs as 12 ea', () => {
    const q = createQuantity('12', 'COUNT');
    expect(q.value).toBe('12');
    expect(q.unit).toBe('ea');
  });
});

describe('unit compatibility', () => {
  it('rejects kg to L without item rule', () => {
    expect(() => rejectCrossDimension('MASS', 'VOLUME')).toThrow(IncompatibleUnitError);
  });

  it('rejects fractional count', () => {
    expect(() => createQuantity('1.5', 'COUNT')).toThrow(InvalidDecimalError);
  });
});

describe('yield normalization', () => {
  const garlicBase = {
    inputQuantity: '1000',
    outputQuantity: '825',
    totalInputCost: createMoney('100000', 'VND', 0),
  };

  it('normalizes garlic unit cost', () => {
    const { unitCost } = normalizeYieldUnitCost(garlicBase);
    expect(unitCost.amountMinorUnits).toBe('121.212121212121');
  });

  it('keeps unit cost invariant under scale 0.2 (200g → 165g)', () => {
    expect(verifyProportionalScaleInvariant(garlicBase, '0.2')).toBe(true);
  });

  it('computes actual batch unit cost', () => {
    const unitCost = computeActualBatchUnitCost(createMoney('50000', 'VND', 0), '200');
    expect(unitCost?.amountMinorUnits).toBe('250');
  });

  it('returns null unit cost for zero output batch (loss)', () => {
    expect(computeActualBatchUnitCost(createMoney('50000', 'VND', 0), '0')).toBeNull();
  });
});

describe('variable-weight receipt', () => {
  it('posts measured quantity for meat packs', () => {
    const q = variableWeightToBase({
      packCount: 4,
      acceptedBaseQuantity: '18.7',
      dimension: 'MASS',
      baseUnit: 'kg',
    });
    expect(q.value).toBe('18.7');
    expect(q.unit).toBe('kg');
  });
});
