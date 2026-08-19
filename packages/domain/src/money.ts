import { InvalidMoneyError } from './errors.js';

export type Money = {
  readonly amountMinor: string;
  readonly currencyCode: string;
  readonly minorUnitExponent: number;
};

const ISO_CURRENCY = /^[A-Z]{3}$/;

export function createMoney(
  amountMinor: string,
  currencyCode: string,
  minorUnitExponent: number,
): Money {
  if (!/^-?\d+$/.test(amountMinor)) {
    throw new InvalidMoneyError(`amountMinor must be an integer string, got: ${amountMinor}`);
  }
  if (!ISO_CURRENCY.test(currencyCode)) {
    throw new InvalidMoneyError(`Invalid currency code: ${currencyCode}`);
  }
  if (!Number.isInteger(minorUnitExponent) || minorUnitExponent < 0 || minorUnitExponent > 4) {
    throw new InvalidMoneyError(`Invalid minor unit exponent: ${minorUnitExponent}`);
  }
  return { amountMinor, currencyCode, minorUnitExponent };
}

export function moneyToCanonicalString(m: Money): string {
  return `${m.amountMinor}:${m.currencyCode}:${m.minorUnitExponent}`;
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currencyCode !== b.currencyCode || a.minorUnitExponent !== b.minorUnitExponent) {
    throw new InvalidMoneyError('Currency mismatch');
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  const sum = (BigInt(a.amountMinor) + BigInt(b.amountMinor)).toString();
  return createMoney(sum, a.currencyCode, a.minorUnitExponent);
}
