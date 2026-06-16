import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, env } from "prisma/config";

const packageRoot = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(packageRoot, ".env"), quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? env("DATABASE_URL"),
  },
});
