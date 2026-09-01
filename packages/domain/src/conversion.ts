import { Decimal, assertPositive, parseCanonicalDecimal } from './decimal.js';
import type { UnitDimension } from './quantity.js';
import { createQuantity, type Quantity } from './quantity.js';
import { IncompatibleUnitError } from './errors.js';

export type UnitConversion = {
  readonly fromUnit: string;
  readonly toBaseUnit: string;
  readonly dimension: UnitDimension;
  readonly factor: string;
  readonly versionId: string;
};

export function convertToBase(quantity: string, unit: string, conversion: UnitConversion): Quantity {
  if (conversion.fromUnit !== unit) {
    throw new IncompatibleUnitError(`Expected unit ${conversion.fromUnit}, got ${unit}`);
  }
  const q = parseCanonicalDecimal(quantity);
  assertPositive(parseCanonicalDecimal(conversion.factor), 'conversion factor');
  const base = q.mul(parseCanonicalDecimal(conversion.factor));
  return createQuantity(base.toFixed(), conversion.dimension, conversion.toBaseUnit);
}

export type FixedPackage = {
  readonly packageId: string;
  readonly versionId: string;
  readonly packCount: number;
  readonly unitQuantity: string;
  readonly unit: string;
  readonly dimension: UnitDimension;
  readonly toBaseUnit: string;
  readonly factorPerUnit: string;
};

/**
 * Fixed package: e.g. 6 bottles × 1 L → 6 L inventory.
 * packCount × unitQuantity × factorPerUnit → base quantity.
 */
export function packageToBaseQuantity(packCount: number, pkg: FixedPackage): Quantity {
  if (!Number.isInteger(packCount) || packCount <= 0) {
    throw new IncompatibleUnitError('packCount must be a positive integer');
  }
  const perUnit = parseCanonicalDecimal(pkg.unitQuantity).mul(parseCanonicalDecimal(pkg.factorPerUnit));
  const total = perUnit.mul(packCount);
  return createQuantity(total.toFixed(), pkg.dimension, pkg.toBaseUnit);
}

export type VariableWeightReceipt = {
  readonly packCount: number;
  readonly acceptedBaseQuantity: string;
  readonly dimension: UnitDimension;
  readonly baseUnit: string;
};

/** Variable-weight: actual measured base quantity wins (ADR-0002). */
export function variableWeightToBase(receipt: VariableWeightReceipt): Quantity {
  if (!Number.isInteger(receipt.packCount) || receipt.packCount <= 0) {
    throw new IncompatibleUnitError('packCount must be a positive integer');
  }
  return createQuantity(receipt.acceptedBaseQuantity, receipt.dimension, receipt.baseUnit);
}

export function rejectCrossDimension(
  fromDimension: UnitDimension,
  toDimension: UnitDimension,
  itemSpecificRuleId?: string,
): void {
  if (fromDimension !== toDimension && !itemSpecificRuleId) {
    throw new IncompatibleUnitError(
      `Cross-dimension conversion from ${fromDimension} to ${toDimension} requires item-specific rule`,
    );
  }
}
