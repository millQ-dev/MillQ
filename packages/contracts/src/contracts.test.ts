import { describe, expect, it } from 'vitest';
import {
  InMemoryOperationalFactStore,
  createFactEnvelope,
  OperationalFactType,
} from './index.js';

const baseContext = {
  businessGroupId: '00000000-0000-4000-8000-000000000001',
  legalEntityId: '00000000-0000-4000-8000-000000000002',
  restaurantLocationId: '00000000-0000-4000-8000-000000000003',
  actorId: '00000000-0000-4000-8000-000000000004',
  jurisdictionProfileVersionId: '00000000-0000-4000-8000-000000000005',
  valuationCurrencyCode: 'VND',
};

function sampleFact(idempotencyKey: string) {
  return createFactEnvelope({
    factId: '10000000-0000-4000-8000-000000000001',
    factType: OperationalFactType.OrderOpened,
    idempotencyKey,
    occurredAt: '2026-08-19T10:00:00.000Z',
    position: { businessDate: '2026-08-19', businessOrder: 1 },
    context: baseContext,
    payload: { orderId: '20000000-0000-4000-8000-000000000001' },
  });
}

describe('InMemoryOperationalFactStore', () => {
  it('creates fact on first ingest', () => {
    const store = new InMemoryOperationalFactStore();
    const result = store.ingest(sampleFact('terminal-1:cmd-1'));
    expect(result.status).toBe('created');
  });

  it('returns duplicate on same idempotency key', () => {
    const store = new InMemoryOperationalFactStore();
    store.ingest(sampleFact('terminal-1:cmd-1'));
    const second = store.ingest(sampleFact('terminal-1:cmd-1'));
    expect(second.status).toBe('duplicate');
    expect(store.list()).toHaveLength(1);
  });
});
