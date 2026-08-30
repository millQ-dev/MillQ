import { describe, expect, it } from 'vitest';
import {
  createMoney,
  createQuantity,
  createCostValue,
  moneyToCostValue,
  packageToBaseQuantity,
  variableWeightToBase,
  rejectCrossDimension,
  normalizeYieldUnitCost,
  normalizeYieldUnitCostFromMoney,
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
    totalInputCost: moneyToCostValue(createMoney('100000', 'VND', 0)),
  };

  it('normalizes garlic unit cost from CostValue', () => {
    const { unitCost } = normalizeYieldUnitCost(garlicBase);
    expect(unitCost.amountMinorUnits).toBe('121.212121212121');
  });

  it('normalizes from posted Money via one-time conversion', () => {
    const { unitCost } = normalizeYieldUnitCostFromMoney(
      '1000',
      '825',
      createMoney('100000', 'VND', 0),
    );
    expect(unitCost.amountMinorUnits).toBe('121.212121212121');
  });

  it.each(['0.2', '0.333', '1.5', '2.75'] as const)(
    'keeps unit cost invariant under scale %s using CostValue (not Money rounding)',
    (scale) => {
      expect(verifyProportionalScaleInvariant(garlicBase, scale)).toBe(true);
    },
  );

  it('scale 0.2 matches 200g / 20000 VND → 165g example', () => {
    const scaled = {
      inputQuantity: '200',
      outputQuantity: '165',
      totalInputCost: createCostValue('20000', 'VND', 0),
    };
    const base = normalizeYieldUnitCost(garlicBase);
    const scaledResult = normalizeYieldUnitCost(scaled);
    expect(scaledResult.unitCost.amountMinorUnits).toBe(base.unitCost.amountMinorUnits);
  });

  it('computes actual batch unit cost 50000 / 200 g → 250', () => {
    const unitCost = computeActualBatchUnitCost(createCostValue('50000', 'VND', 0), '200');
    expect(unitCost?.amountMinorUnits).toBe('250');
  });

  it('returns null unit cost for zero output batch (loss)', () => {
    expect(computeActualBatchUnitCost(createCostValue('50000', 'VND', 0), '0')).toBeNull();
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
