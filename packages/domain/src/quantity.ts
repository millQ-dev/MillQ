import { Decimal, assertNonNegative, parseCanonicalDecimal, toCanonicalDecimal } from './decimal.js';
import { IncompatibleUnitError, InvalidDecimalError } from './errors.js';

export type UnitDimension = 'MASS' | 'VOLUME' | 'COUNT';

export type Quantity = {
  readonly value: string;
  readonly unit: string;
  readonly dimension: UnitDimension;
};

const BASE_UNITS: Record<UnitDimension, string> = {
  MASS: 'g',
  VOLUME: 'ml',
  COUNT: 'ea',
};

export function createQuantity(value: string, dimension: UnitDimension, unit?: string): Quantity {
  const d = parseCanonicalDecimal(value);
  assertNonNegative(d, 'quantity');
  if (dimension === 'COUNT' && !d.isInteger()) {
    throw new InvalidDecimalError('COUNT dimension requires integer quantity');
  }
  const resolvedUnit = unit ?? BASE_UNITS[dimension];
  return { value: toCanonicalDecimal(d), unit: resolvedUnit, dimension };
}

export function assertSameDimension(a: Quantity, b: Quantity): void {
  if (a.dimension !== b.dimension) {
    throw new IncompatibleUnitError(
      `Cannot combine ${a.dimension} (${a.unit}) with ${b.dimension} (${b.unit})`,
    );
  }
}

export function addQuantities(a: Quantity, b: Quantity): Quantity {
  assertSameDimension(a, b);
  if (a.unit !== b.unit) {
    throw new IncompatibleUnitError(`Unit mismatch: ${a.unit} vs ${b.unit}`);
  }
  const sum = parseCanonicalDecimal(a.value).plus(parseCanonicalDecimal(b.value));
  return createQuantity(toCanonicalDecimal(sum), a.dimension, a.unit);
}

export function multiplyQuantity(q: Quantity, factor: string): Quantity {
  const f = parseCanonicalDecimal(factor);
  assertNonNegative(f, 'factor');
  const product = parseCanonicalDecimal(q.value).mul(f);
  return createQuantity(toCanonicalDecimal(product), q.dimension, q.unit);
}

export { BASE_UNITS };
