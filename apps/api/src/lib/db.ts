import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";

/**
 * Verbinding met MySQL (RDS/Aurora, eu-west-1).
 * Toegangscontrole gebeurt in de applicatie (zie lib/access.ts), niet met
 * database-RLS.
 */
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL ontbreekt");
    pool = mysql.createPool({
      uri: url,
      waitForConnections: true,
      connectionLimit: 10,
      // RDS vereist TLS.
      ssl: process.env.DB_SSL_DISABLE === "true" ? undefined : { rejectUnauthorized: true },
      timezone: "Z",
      supportBigNumbers: true,
    });
  }
  return pool;
}

export function isConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Query die rijen teruggeeft. */
export async function query<T = RowDataPacket>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}

/** Query voor mutaties (insert/update/delete); geeft het ResultSetHeader terug. */
export async function exec(sql: string, params: any[] = []): Promise<mysql.ResultSetHeader> {
  const [res] = await getPool().execute(sql, params);
  return res as mysql.ResultSetHeader;
}

/** Werk uit binnen één transactie (bijv. cliënt + eigenaar-lidmaatschap samen). */
export async function tx<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
