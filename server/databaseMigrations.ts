import path from "node:path";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

export function getMigrationsFolder(cwd = process.cwd()) {
  return path.resolve(cwd, "drizzle");
}

export function shouldRunProductionMigrations(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === "production" && Boolean(env.DATABASE_URL) && env.RUN_DB_MIGRATIONS !== "false";
}

/**
 * Apply committed Drizzle migrations before the production server accepts traffic.
 * This is intentionally production-only so local development and unit tests never
 * mutate a developer database just by importing the server entrypoint.
 */
export async function ensureProductionDatabaseSchema() {
  if (!shouldRunProductionMigrations()) {
    return { status: "skipped" as const, migrationsFolder: getMigrationsFolder() };
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return { status: "skipped" as const, migrationsFolder: getMigrationsFolder() };
  }

  const migrationsFolder = getMigrationsFolder();
  const database = drizzle(databaseUrl);
  await migrate(database, { migrationsFolder });
  console.log(`[Database] Production migrations applied from ${migrationsFolder}`);
  return { status: "ready" as const, migrationsFolder };
}
