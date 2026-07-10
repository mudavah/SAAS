import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Reuse a single connection pool across hot-reloads / serverless invocations.
// Without this, every module re-evaluation opens a new pool and Postgres
// connection limits are exhausted quickly.
const globalForDb = globalThis as unknown as {
  __kfPgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__kfPgClient ??
  postgres(connectionString, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__kfPgClient = client;
}

export const db = drizzle(client, { schema });
