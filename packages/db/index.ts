import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { PrismaClient, Prisma } from "./generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const packageRoot = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(packageRoot, ".env"), quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Configure it in the environment before starting the app.",
  );
}

const requiresSsl =
  process.env.NODE_ENV === "production" ||
  /supabase|render\.com|neon\.tech|amazonaws\.com/i.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export { Prisma };

export * from "./generated/prisma/enums.ts";
