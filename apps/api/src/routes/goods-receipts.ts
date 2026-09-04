import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { GoodsReceiptService } from '../modules/procurement/goods-receipt-service.js';
import {
  DomainValidationError,
  IdempotencyConflictError,
  NotFoundError,
  PostedImmutableError,
} from '../modules/procurement/errors.js';

function mapError(err: unknown): { status: number; body: Record<string, unknown> } {
  if (err instanceof DomainValidationError) {
    return { status: 400, body: { error: err.code, message: err.message } };
  }
  if (err instanceof PostedImmutableError) {
    return { status: 409, body: { error: err.code, message: err.message } };
  }
  if (err instanceof IdempotencyConflictError) {
    return { status: 409, body: { error: err.code, message: err.message } };
  }
  if (err instanceof NotFoundError) {
    return { status: 404, body: { error: err.code, message: err.message } };
  }
  if (err && typeof err === 'object' && 'issues' in err) {
    return { status: 400, body: { error: 'VALIDATION', message: String(err) } };
  }
  throw err;
}

export async function registerGoodsReceiptRoutes(app: FastifyInstance, pool: pg.Pool) {
  const service = new GoodsReceiptService(pool);

  app.post('/api/v1/goods-receipts', async (req, reply) => {
    try {
      const doc = await service.createDraft(req.body);
      return reply.code(201).send(doc);
    } catch (err) {
      const mapped = mapError(err);
      return reply.code(mapped.status).send(mapped.body);
    }
  });

  app.get<{ Params: { id: string } }>('/api/v1/goods-receipts/:id', async (req, reply) => {
    try {
      const doc = await service.get(req.params.id);
      if (!doc) return reply.code(404).send({ error: 'NOT_FOUND' });
      return doc;
    } catch (err) {
      const mapped = mapError(err);
      return reply.code(mapped.status).send(mapped.body);
    }
  });

  app.patch<{ Params: { id: string } }>('/api/v1/goods-receipts/:id', async (req, reply) => {
    try {
      const doc = await service.updateDraft(req.params.id, req.body);
      return doc;
    } catch (err) {
      const mapped = mapError(err);
      return reply.code(mapped.status).send(mapped.body);
    }
  });

  app.post<{ Params: { id: string } }>('/api/v1/goods-receipts/:id/validate', async (req, reply) => {
    try {
      return await service.validate(req.params.id);
    } catch (err) {
      const mapped = mapError(err);
      return reply.code(mapped.status).send(mapped.body);
    }
  });

  app.post<{ Params: { id: string } }>('/api/v1/goods-receipts/:id/post', async (req, reply) => {
    try {
      const result = await service.post(req.params.id, req.body);
      return reply.code(result.status === 'created' ? 200 : 200).send(result);
    } catch (err) {
      const mapped = mapError(err);
      return reply.code(mapped.status).send(mapped.body);
    }
  });

  app.post<{ Params: { id: string } }>('/api/v1/goods-receipts/:id/reverse', async (req, reply) => {
    try {
      const body = (req.body ?? {}) as { idempotencyKey?: string; actorId?: string; reason?: string };
      if (!body.idempotencyKey) {
        return reply.code(400).send({ error: 'VALIDATION', message: 'idempotencyKey required' });
      }
      return await service.reverse(req.params.id, {
        idempotencyKey: body.idempotencyKey,
        ...(body.actorId ? { actorId: body.actorId } : {}),
        ...(body.reason ? { reason: body.reason } : {}),
      });
    } catch (err) {
      const mapped = mapError(err);
      return reply.code(mapped.status).send(mapped.body);
    }
  });

  app.get<{
    Querystring: { legalEntityId: string; warehouseId: string; catalogItemId: string };
  }>('/api/v1/inventory/balance', async (req, reply) => {
    const { legalEntityId, warehouseId, catalogItemId } = req.query;
    if (!legalEntityId || !warehouseId || !catalogItemId) {
      return reply.code(400).send({ error: 'VALIDATION', message: 'legalEntityId, warehouseId, catalogItemId required' });
    }
    return service.getBalance(legalEntityId, warehouseId, catalogItemId);
  });

  app.get<{
    Querystring: { legalEntityId: string; warehouseId: string; catalogItemId: string };
  }>('/api/v1/costing/quote', async (req, reply) => {
    const balance = await service.getBalance(
      req.query.legalEntityId,
      req.query.warehouseId,
      req.query.catalogItemId,
    );
    return { costQuote: balance.costQuote, quantity: balance.quantity };
  });
}
