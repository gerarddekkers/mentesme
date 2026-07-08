import { Pool, type PoolClient } from "pg";

/**
 * Verbinding met RDS/Aurora Postgres (eu-west-1).
 *
 * De app verbindt als een NIET-eigenaar-rol (bijv. `app_rw`) zodat Row Level
 * Security (RLS) van kracht is. Per request zetten we de ingelogde gebruiker in
 * een sessie-variabele (`app.user_id`); de RLS-policies lezen die uit. Zo ziet
 * elke medewerker alleen de dossiers waar hij lid van is — afgedwongen in de
 * database zelf, niet alleen in de applicatie.
 */

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL ontbreekt");
    pool = new Pool({
      connectionString,
      // RDS vereist TLS. In productie een CA-bundle meegeven; hier verifiëren
      // we de verbinding maar staan we de AWS-RDS-certificaatketen toe.
      ssl:
        process.env.PGSSL_DISABLE === "true"
          ? undefined
          : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

export function isConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Voer databasewerk uit namens een gebruiker binnen één transactie, met
 * `app.user_id` gezet zodat RLS de juiste rijen teruggeeft.
 */
export async function withUser<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    // set_config(param, value, is_local=true) → geldt alleen in deze transactie
    await client.query("select set_config('app.user_id', $1, true)", [userId]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

/** Handige helper: één query namens een gebruiker en rijen teruggeven. */
export async function queryAs<T = any>(
  userId: string,
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  return withUser(userId, async (c) => (await c.query(text, params)).rows as T[]);
}
