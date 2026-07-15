import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js loads .env.local automatically; drizzle-kit does not
config({ path: ".env.local" });
config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.includes("@host:")) {
  throw new Error(
    [
      "DATABASE_URL is missing or still using the placeholder in .env.local.",
      "",
      "1. Create a free database at https://neon.tech or https://supabase.com",
      "2. Copy the PostgreSQL connection string into .env.local:",
      '   DATABASE_URL=postgresql://REPLACE_WITH_DB_USER:REPLACE_WITH_DB_PASSWORD@REPLACE_WITH_DB_HOST:5432/REPLACE_WITH_DB_NAME?sslmode=require',
      "3. Run: npm run db:push",
    ].join("\n")
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
