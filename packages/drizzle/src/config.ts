import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export type Db = NodePgDatabase & { $client: Pool };

export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

export function createDb(url: string): Db {
  const pool = new Pool({
    connectionString: url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return drizzle(pool);
}
