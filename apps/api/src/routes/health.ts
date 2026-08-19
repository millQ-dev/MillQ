import type { FastifyInstance } from 'fastify';
import type pg from 'pg';

export async function registerHealthRoutes(
  app: FastifyInstance,
  pool: pg.Pool,
): Promise<void> {
  app.get('/health', async () => {
    const db = await pool.query('SELECT 1').then(() => 'up' as const).catch(() => 'down' as const);
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      service: 'millq-api',
      checks: { database: db },
      timestamp: new Date().toISOString(),
    };
  });
}
