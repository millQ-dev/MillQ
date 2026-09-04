import { describe, expect, it } from 'vitest';
import {
  resolveAcceptedBaseQuantity,
  expectedLineAcquisitionMinor,
  assertLineAcquisitionMatches,
} from './quantity.js';
import { DomainValidationError } from './errors.js';
import type { GoodsReceiptLineInput } from './types.js';

const milkPack = {
  pack_kind: 'FIXED' as const,
  units_per_package: 1,
  unit_quantity: '1',
  unit: 'L',
  dimension: 'VOLUME',
  to_base_unit: 'L',
  factor_per_unit: '1',
};

const oilPack = {
  pack_kind: 'FIXED' as const,
  units_per_package: 12,
  unit_quantity: '0.75',
  unit: 'L',
  dimension: 'VOLUME',
  to_base_unit: 'L',
  factor_per_unit: '1',
};

describe('resolveAcceptedBaseQuantity', () => {
  it('fixed milk 6 × 1 L → 6 L', () => {
    const line: GoodsReceiptLineInput = {
      lineNumber: 1,
      catalogItemId: '00000000-0000-4000-8000-000000000001',
      inputKind: 'FIXED_PACKAGE',
      packageCount: 6,
      acceptedBaseQuantity: '6',
      baseUnit: 'L',
      dimension: 'VOLUME',
      unitPriceMinor: '10000',
      lineAcquisitionCostMinor: '60000',
    };
    const q = resolveAcceptedBaseQuantity(line, { catalog_item_id: line.catalogItemId, base_unit: 'L', dimension: 'VOLUME' }, milkPack);
    expect(q.quantity).toBe('6');
  });

  it('multipack oil 1 × (12 × 0.75 L) → 9 L', () => {
    const line: GoodsReceiptLineInput = {
      lineNumber: 1,
      catalogItemId: '00000000-0000-4000-8000-000000000002',
      inputKind: 'FIXED_PACKAGE',
      packageCount: 1,
      acceptedBaseQuantity: '9',
      baseUnit: 'L',
      dimension: 'VOLUME',
      unitPriceMinor: '5000',
      lineAcquisitionCostMinor: '45000',
    };
    expect(
      resolveAcceptedBaseQuantity(
        line,
        { catalog_item_id: line.catalogItemId, base_unit: 'L', dimension: 'VOLUME' },
        oilPack,
      ).quantity,
    ).toBe('9');
  });

  it('rejects wrong accepted quantity for fixed pack', () => {
    const line: GoodsReceiptLineInput = {
      lineNumber: 1,
      catalogItemId: '00000000-0000-4000-8000-000000000001',
      inputKind: 'FIXED_PACKAGE',
      packageCount: 6,
      acceptedBaseQuantity: '5',
      baseUnit: 'L',
      dimension: 'VOLUME',
      unitPriceMinor: '10000',
      lineAcquisitionCostMinor: '50000',
    };
    expect(() =>
      resolveAcceptedBaseQuantity(
        line,
        { catalog_item_id: line.catalogItemId, base_unit: 'L', dimension: 'VOLUME' },
        milkPack,
      ),
    ).toThrow(DomainValidationError);
  });

  it('variable weight uses measured mass not package count', () => {
    const line: GoodsReceiptLineInput = {
      lineNumber: 1,
      catalogItemId: '00000000-0000-4000-8000-000000000003',
      inputKind: 'VARIABLE_WEIGHT',
      packageCount: 4,
      acceptedBaseQuantity: '18.7',
      baseUnit: 'kg',
      dimension: 'MASS',
      unitPriceMinor: '100000',
      lineAcquisitionCostMinor: '1870000',
    };
    expect(
      resolveAcceptedBaseQuantity(
        line,
        { catalog_item_id: line.catalogItemId, base_unit: 'kg', dimension: 'MASS' },
        null,
      ).quantity,
    ).toBe('18.7');
  });

  it('COUNT eggs 24 ea', () => {
    const line: GoodsReceiptLineInput = {
      lineNumber: 1,
      catalogItemId: '00000000-0000-4000-8000-000000000004',
      inputKind: 'COUNT',
      packageCount: 24,
      acceptedBaseQuantity: '24',
      baseUnit: 'ea',
      dimension: 'COUNT',
      unitPriceMinor: '3000',
      lineAcquisitionCostMinor: '72000',
    };
    expect(
      resolveAcceptedBaseQuantity(
        line,
        { catalog_item_id: line.catalogItemId, base_unit: 'ea', dimension: 'COUNT' },
        null,
      ).quantity,
    ).toBe('24');
  });

  it('line acquisition matches unit × qty', () => {
    expect(expectedLineAcquisitionMinor('100000', '18.7')).toBe('1870000');
    expect(() =>
      assertLineAcquisitionMatches({
        lineNumber: 1,
        catalogItemId: '00000000-0000-4000-8000-000000000003',
        inputKind: 'VARIABLE_WEIGHT',
        packageCount: 4,
        acceptedBaseQuantity: '18.7',
        baseUnit: 'kg',
        dimension: 'MASS',
        unitPriceMinor: '100000',
        lineAcquisitionCostMinor: '1',
      }),
    ).toThrow(DomainValidationError);
  });
});
