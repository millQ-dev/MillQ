import pg from 'pg';

const { Pool } = pg;

export function createPool(connectionString: string): pg.Pool {
  return new Pool({ connectionString });
}

export async function checkDatabase(pool: pg.Pool): Promise<'up' | 'down'> {
  try {
    await pool.query('SELECT 1');
    return 'up';
  } catch {
    return 'down';
  }
}
