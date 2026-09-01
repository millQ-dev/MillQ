import { describe, expect, it } from 'vitest';
import {
  InMemoryOperationalFactStore,
  IdempotencyConflictError,
  createOperationalFact,
  parseOperationalFact,
  OperationalFactType,
  UnknownOperationalFactTypeError,
  OperationalFactPayloadMismatchError,
} from './index.js';

const baseContext = {
  businessGroupId: '00000000-0000-4000-8000-000000000001',
  legalEntityId: '00000000-0000-4000-8000-000000000002',
  restaurantLocationId: '00000000-0000-4000-8000-000000000003',
  actorId: '00000000-0000-4000-8000-000000000004',
  jurisdictionProfileVersionId: '00000000-0000-4000-8000-000000000005',
  valuationCurrencyCode: 'VND',
};

function orderOpenedFact(overrides: Record<string, unknown> = {}) {
  return createOperationalFact({
    factId: '10000000-0000-4000-8000-000000000001',
    factType: OperationalFactType.OrderOpened,
    idempotencyKey: 'terminal-1:cmd-1',
    occurredAt: '2026-08-19T10:00:00.000Z',
    position: { businessDate: '2026-08-19', businessOrder: 1 },
    context: baseContext,
    payload: {
      orderId: '20000000-0000-4000-8000-000000000001',
      channel: 'POS',
    },
    ...overrides,
  } as Parameters<typeof createOperationalFact>[0]);
}

describe('parseOperationalFact type safety', () => {
  it('accepts correct fact type + correct payload', () => {
    const fact = parseOperationalFact(orderOpenedFact());
    expect(fact.factType).toBe(OperationalFactType.OrderOpened);
  });

  it('rejects correct fact type + wrong payload shape', () => {
    expect(() =>
      parseOperationalFact({
        ...orderOpenedFact(),
        factType: OperationalFactType.GoodsReceived,
        payload: {
          orderId: '20000000-0000-4000-8000-000000000001',
          channel: 'POS',
        },
      }),
    ).toThrow(OperationalFactPayloadMismatchError);
  });

  it('rejects unknown fact type at authoritative ingestion', () => {
    expect(() =>
      parseOperationalFact({
        ...orderOpenedFact(),
        factType: 'TotallyUnknownFact',
      }),
    ).toThrow(UnknownOperationalFactTypeError);
  });
});

describe('InMemoryOperationalFactStore idempotency', () => {
  it('creates fact on first ingest', () => {
    const store = new InMemoryOperationalFactStore();
    const result = store.ingest(orderOpenedFact());
    expect(result.status).toBe('created');
  });

  it('exact retry returns duplicate', () => {
    const store = new InMemoryOperationalFactStore();
    store.ingest(orderOpenedFact());
    const second = store.ingest(orderOpenedFact());
    expect(second.status).toBe('duplicate');
    expect(store.list()).toHaveLength(1);
  });

  it('same key + only server metadata differs → duplicate', () => {
    const store = new InMemoryOperationalFactStore();
    store.ingest(orderOpenedFact());
    const retry = orderOpenedFact({
      factId: '10000000-0000-4000-8000-000000000099',
      recordedAt: '2026-08-19T12:00:00.000Z',
    });
    const second = store.ingest(retry);
    expect(second.status).toBe('duplicate');
    expect(second.fact.factId).toBe('10000000-0000-4000-8000-000000000001');
  });

  it('same key + different payload → IDEMPOTENCY_CONFLICT', () => {
    const store = new InMemoryOperationalFactStore();
    store.ingest(orderOpenedFact());
    expect(() =>
      store.ingest(
        orderOpenedFact({
          payload: {
            orderId: '20000000-0000-4000-8000-000000000002',
            channel: 'POS',
          },
        }),
      ),
    ).toThrow(IdempotencyConflictError);
  });

  it('same key + different factType → IDEMPOTENCY_CONFLICT', () => {
    const store = new InMemoryOperationalFactStore();
    store.ingest(orderOpenedFact());
    expect(() =>
      store.ingest(
        createOperationalFact({
          factId: '10000000-0000-4000-8000-000000000002',
          factType: OperationalFactType.OrderCancelled,
          idempotencyKey: 'terminal-1:cmd-1',
          occurredAt: '2026-08-19T10:00:00.000Z',
          position: { businessDate: '2026-08-19', businessOrder: 1 },
          context: baseContext,
          payload: {
            orderId: '20000000-0000-4000-8000-000000000001',
            reason: 'customer left',
            inventoryWriteOff: false,
          },
        }),
      ),
    ).toThrow(IdempotencyConflictError);
  });
});
