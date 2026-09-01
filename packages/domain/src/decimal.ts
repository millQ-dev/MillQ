import { Decimal } from 'decimal.js';
import { InvalidDecimalError } from './errors.js';

/** Canonical decimal string per ADR-0002: ASCII digits, optional minus, single dot, no scientific notation. */
const CANONICAL_DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

export type DecimalValue = Decimal.Instance;

export function parseCanonicalDecimal(value: string): DecimalValue {
  const trimmed = value.trim();
  if (!CANONICAL_DECIMAL.test(trimmed)) {
    throw new InvalidDecimalError(`Invalid canonical decimal: ${value}`);
  }
  const d = new Decimal(trimmed);
  if (d.isZero() && trimmed.startsWith('-')) {
    return new Decimal(0);
  }
  return d;
}

export function toCanonicalDecimal(d: DecimalValue, maxFractionDigits?: number): string {
  let normalized = d;
  if (normalized.isZero()) {
    return '0';
  }
  if (maxFractionDigits !== undefined) {
    normalized = normalized.toDecimalPlaces(maxFractionDigits, Decimal.ROUND_HALF_EVEN);
  }
  return normalized.toFixed();
}

export function assertNonNegative(d: DecimalValue, label: string): void {
  if (d.isNegative()) {
    throw new InvalidDecimalError(`${label} must be non-negative`);
  }
}

export function assertPositive(d: DecimalValue, label: string): void {
  if (!d.gt(0)) {
    throw new InvalidDecimalError(`${label} must be positive`);
  }
}

export { Decimal };
