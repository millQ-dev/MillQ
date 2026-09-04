/**
 * Moving weighted-average costing (ADR-0003).
 * Cost stream scope: warehouse + catalogItem + valuationCurrency (+ legalEntity boundary).
 */
import { Decimal, parseCanonicalDecimal, toCanonicalDecimal, type DecimalValue } from './decimal.js';
import { createCostValue, roundCostValue, type CostValue } from './cost-value.js';
import { InvalidDecimalError } from './errors.js';

export type CostCertainty = 'FINAL' | 'ESTIMATED_FROM_LAST_KNOWN' | 'UNKNOWN' | 'ORDER_UNRESOLVED';

export type CostQuote = {
  readonly amountMinorUnits: string;
  readonly currencyCode: string;
  readonly minorUnitExponent: number;
  readonly certainty: CostCertainty;
  readonly basis: 'ACTUAL_STOCK_VALUATION' | 'SUPPLIER_PRICE' | 'ESTIMATED';
  readonly asOfBusinessDate: string;
  readonly asOfBusinessOrder: number;
};

export type CostStreamState = {
  readonly quantity: string;
  readonly carryingValueMinor: string;
  readonly currencyCode: string;
  readonly minorUnitExponent: number;
};

export function deriveUnitCost(state: CostStreamState): CostValue | null {
  const qty = parseCanonicalDecimal(state.quantity);
  if (qty.lte(0)) {
    return null;
  }
  const carrying = parseCanonicalDecimal(state.carryingValueMinor);
  return roundCostValue(carrying.div(qty), state.currencyCode, state.minorUnitExponent);
}

/**
 * Positive inbound with no open deficit: newAvg = (oldValue + inboundCost) / (oldQty + inboundQty)
 */
export function applyPositiveInbound(
  state: CostStreamState,
  inboundQuantity: string,
  inboundCost: CostValue,
): CostStreamState {
  if (inboundCost.currencyCode !== state.currencyCode || inboundCost.minorUnitExponent !== state.minorUnitExponent) {
    throw new InvalidDecimalError('Inbound cost currency mismatch');
  }
  const qty = parseCanonicalDecimal(state.quantity);
  const inboundQty = parseCanonicalDecimal(inboundQuantity);
  if (inboundQty.lte(0)) {
    throw new InvalidDecimalError('Inbound quantity must be positive');
  }
  const newQty = qty.plus(inboundQty);
  const newValue = parseCanonicalDecimal(state.carryingValueMinor).plus(
    parseCanonicalDecimal(inboundCost.amountMinorUnits),
  );
  return {
    quantity: toCanonicalDecimal(newQty),
    carryingValueMinor: toCanonicalDecimal(newValue),
    currencyCode: state.currencyCode,
    minorUnitExponent: state.minorUnitExponent,
  };
}

/**
 * Compensating outbound for reversal: reduce qty and carrying value at historical unit cost portion.
 * For full receipt reversal: outboundQty = original inbound qty, outboundCost = original inbound cost.
 */
export function applyCompensatingOutbound(
  state: CostStreamState,
  outboundQuantity: string,
  outboundCost: CostValue,
): CostStreamState {
  if (outboundCost.currencyCode !== state.currencyCode || outboundCost.minorUnitExponent !== state.minorUnitExponent) {
    throw new InvalidDecimalError('Outbound cost currency mismatch');
  }
  const newQty = parseCanonicalDecimal(state.quantity).minus(parseCanonicalDecimal(outboundQuantity));
  const newValue = parseCanonicalDecimal(state.carryingValueMinor).minus(
    parseCanonicalDecimal(outboundCost.amountMinorUnits),
  );
  return {
    quantity: toCanonicalDecimal(newQty),
    carryingValueMinor: toCanonicalDecimal(newValue),
    currencyCode: state.currencyCode,
    minorUnitExponent: state.minorUnitExponent,
  };
}

export function emptyCostStream(
  currencyCode: string,
  minorUnitExponent: number,
): CostStreamState {
  return {
    quantity: '0',
    carryingValueMinor: '0',
    currencyCode,
    minorUnitExponent,
  };
}

export function costQuoteFromStream(
  state: CostStreamState,
  asOfBusinessDate: string,
  asOfBusinessOrder: number,
): CostQuote {
  const unit = deriveUnitCost(state);
  if (!unit) {
    return {
      amountMinorUnits: '0',
      currencyCode: state.currencyCode,
      minorUnitExponent: state.minorUnitExponent,
      certainty: 'UNKNOWN',
      basis: 'ACTUAL_STOCK_VALUATION',
      asOfBusinessDate,
      asOfBusinessOrder,
    };
  }
  return {
    amountMinorUnits: unit.amountMinorUnits,
    currencyCode: unit.currencyCode,
    minorUnitExponent: unit.minorUnitExponent,
    certainty: 'FINAL',
    basis: 'ACTUAL_STOCK_VALUATION',
    asOfBusinessDate,
    asOfBusinessOrder,
  };
}

/** Line acquisition value = unit purchase price (money) × base quantity, as CostValue */
export function lineAcquisitionCost(
  unitPriceMinor: string,
  currencyCode: string,
  minorUnitExponent: number,
  baseQuantity: string,
): CostValue {
  const price = parseCanonicalDecimal(unitPriceMinor);
  const qty = parseCanonicalDecimal(baseQuantity);
  return roundCostValue(price.mul(qty), currencyCode, minorUnitExponent);
}

export function assertBusinessChronologyLess(
  a: { businessDate: string; businessOrder: number },
  b: { businessDate: string; businessOrder: number },
): boolean {
  if (a.businessDate < b.businessDate) return true;
  if (a.businessDate > b.businessDate) return false;
  return a.businessOrder < b.businessOrder;
}

export function compareBusinessPosition(
  a: { businessDate: string; businessOrder: number },
  b: { businessDate: string; businessOrder: number },
): number {
  if (a.businessDate < b.businessDate) return -1;
  if (a.businessDate > b.businessDate) return 1;
  return a.businessOrder - b.businessOrder;
}
