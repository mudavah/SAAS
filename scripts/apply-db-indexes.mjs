#!/usr/bin/env node
// KaziFlow — apply production index optimizations (Database Optimization)
// ------------------------------------------------------------------------------
// Runs scripts/db-optimize.sql against DATABASE_URL using the same `postgres`
// driver the app uses. Safe to re-run (all statements use IF NOT EXISTS).
//
//   node scripts/apply-db-indexes.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(here, "db-optimize.sql");
const sql = readFileSync(sqlPath, "utf8");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(url, { max: 1 });
try {
  await client.unsafe(sql);
  console.log("Applied database optimizations (indexes + ANALYZE).");
} catch (err) {
  console.error("Failed to apply optimizations:", err);
  process.exitCode = 1;
} finally {
  await client.end();
}
