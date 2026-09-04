import {
  packageToBaseQuantity,
  variableWeightToBase,
  createQuantity,
  parseCanonicalDecimal,
  Decimal,
  type UnitDimension,
} from '@millq/domain';
import { DomainValidationError } from './errors.js';
import type { GoodsReceiptLineInput } from './types.js';

export type SupplierPackRow = {
  pack_kind: 'FIXED' | 'VARIABLE_WEIGHT' | 'COUNT';
  units_per_package: number;
  unit_quantity: string | null;
  unit: string | null;
  dimension: string | null;
  to_base_unit: string | null;
  factor_per_unit: string | null;
};

export type CatalogItemRow = {
  catalog_item_id: string;
  base_unit: string;
  dimension: string;
};

export function resolveAcceptedBaseQuantity(
  line: GoodsReceiptLineInput,
  catalog: CatalogItemRow,
  pack: SupplierPackRow | null,
): { quantity: string; baseUnit: string; dimension: UnitDimension } {
  if (catalog.dimension !== line.dimension) {
    throw new DomainValidationError(
      'DIMENSION_MISMATCH',
      `Line dimension ${line.dimension} does not match catalog item ${catalog.dimension}`,
    );
  }
  if (catalog.base_unit !== line.baseUnit) {
    throw new DomainValidationError(
      'BASE_UNIT_MISMATCH',
      `Line base unit ${line.baseUnit} does not match catalog ${catalog.base_unit}`,
    );
  }

  if (line.inputKind === 'COUNT') {
    if (line.dimension !== 'COUNT') {
      throw new DomainValidationError('INVALID_COUNT', 'COUNT input requires COUNT dimension');
    }
    const q = createQuantity(line.acceptedBaseQuantity, 'COUNT', line.baseUnit);
    return { quantity: q.value, baseUnit: q.unit, dimension: 'COUNT' };
  }

  if (line.inputKind === 'VARIABLE_WEIGHT') {
    if (!line.packageCount) {
      throw new DomainValidationError('MISSING_PACKAGE_COUNT', 'Variable weight requires packageCount');
    }
    const q = variableWeightToBase({
      packCount: line.packageCount,
      acceptedBaseQuantity: line.acceptedBaseQuantity,
      dimension: line.dimension,
      baseUnit: line.baseUnit,
    });
    return { quantity: q.value, baseUnit: q.unit, dimension: line.dimension };
  }

  if (!pack || pack.pack_kind !== 'FIXED') {
    throw new DomainValidationError('MISSING_FIXED_PACK', 'FIXED_PACKAGE requires FIXED supplier pack');
  }
  if (!line.packageCount) {
    throw new DomainValidationError('MISSING_PACKAGE_COUNT', 'Fixed package requires packageCount');
  }
  if (!pack.unit_quantity || !pack.unit || !pack.dimension || !pack.to_base_unit || !pack.factor_per_unit) {
    throw new DomainValidationError('INVALID_PACK', 'Fixed pack definition incomplete');
  }
  if (pack.dimension !== line.dimension) {
    throw new DomainValidationError('PACK_DIMENSION_MISMATCH', 'Pack dimension mismatch');
  }
  const unitsPerPackage = pack.units_per_package ?? 1;
  if (!Number.isInteger(unitsPerPackage) || unitsPerPackage <= 0) {
    throw new DomainValidationError('INVALID_PACK', 'units_per_package must be a positive integer');
  }
  // received supplier packages × inner units × unit quantity → base inventory
  const effectiveUnitCount = line.packageCount * unitsPerPackage;
  const q = packageToBaseQuantity(effectiveUnitCount, {
    packageId: 'runtime',
    versionId: 'v1',
    packCount: unitsPerPackage,
    unitQuantity: pack.unit_quantity,
    unit: pack.unit,
    dimension: pack.dimension as UnitDimension,
    toBaseUnit: pack.to_base_unit,
    factorPerUnit: pack.factor_per_unit,
  });
  if (q.value !== line.acceptedBaseQuantity) {
    throw new DomainValidationError(
      'ACCEPTED_QTY_MISMATCH',
      `Expected accepted base quantity ${q.value} from package conversion, got ${line.acceptedBaseQuantity}`,
    );
  }
  return { quantity: q.value, baseUnit: q.unit, dimension: line.dimension };
}

/** unitPriceMinor × acceptedBaseQuantity as integer minor string (truncated toward zero for money quantum of line total). */
export function expectedLineAcquisitionMinor(unitPriceMinor: string, acceptedBaseQuantity: string): string {
  const product = parseCanonicalDecimal(unitPriceMinor).mul(parseCanonicalDecimal(acceptedBaseQuantity));
  return product.toDecimalPlaces(0, Decimal.ROUND_DOWN).toFixed(0);
}

export function assertLineAcquisitionMatches(line: GoodsReceiptLineInput): void {
  const expected = expectedLineAcquisitionMinor(line.unitPriceMinor, line.acceptedBaseQuantity);
  if (expected !== line.lineAcquisitionCostMinor) {
    throw new DomainValidationError(
      'LINE_COST_MISMATCH',
      `Expected line acquisition ${expected}, got ${line.lineAcquisitionCostMinor}`,
    );
  }
}

export { parseCanonicalDecimal };
