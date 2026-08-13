import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ensureProductionDatabaseSchema,
  getMigrationsFolder,
  isExistingTableMigrationError,
  isIgnorableSchemaConflict,
  rewriteTiDbJsonDefaults,
  type MigrationDependencies,
  shouldRunProductionMigrations,
} from "./databaseMigrations";

const EXPECTED_TABLES = [
  "users", "pubg_accounts", "orders", "reviews", "transactions", "notifications", "disputes", "favorites",
  "chat_threads", "chat_messages", "admin_audit_logs", "recently_viewed", "referrals", "negotiations",
  "auctions", "auction_bids", "promo_codes", "support_tickets", "seller_verifications", "premium_promotions",
  "support_ticket_messages", "seller_badge_audits", "price_estimates", "price_evaluation_rules", "security_audits",
];

function withProductionEnv<T>(callback: () => Promise<T>) {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.NODE_ENV = "production";
  process.env.DATABASE_URL = "mysql://example";
  return callback().finally(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });
}

function makeRecoveryConnection(statementError?: unknown, emulateTiDbJsonDefaultError = false) {
  const query = vi.fn(async (sql: string) => {
    const normalized = sql.trim();
    if (emulateTiDbJsonDefaultError && normalized.includes("DEFAULT ('[]')")) {
      throw { code: "ER_PARSE_ERROR", errno: 1064 };
    }
    if (emulateTiDbJsonDefaultError && normalized.includes("`galleryUrls` json NOT NULL") && !normalized.includes("DEFAULT")) return [[], []];
    if (normalized.includes("GET_LOCK")) return [[{ lock_result: 1 }], []];
    if (normalized.includes("RELEASE_LOCK")) return [[], []];
    if (normalized.includes("information_schema.tables")) {
      return [EXPECTED_TABLES.map(TABLE_NAME => ({ TABLE_NAME })), []];
    }
    if (normalized.includes("SELECT hash, created_at")) return [[], []];
    if (normalized.startsWith("CREATE TABLE IF NOT EXISTS") || normalized.startsWith("INSERT INTO `__drizzle_migrations`")) return [[], []];
    if (statementError) throw statementError;
    throw { code: "ER_TABLE_EXISTS_ERROR", errno: 1050 };
  });
  return { query, end: vi.fn(async () => undefined) };
}

function makeDependencies(connection: ReturnType<typeof makeRecoveryConnection>, migrationError: unknown, migrationSql = "CREATE TABLE `disputes` (id int)"): MigrationDependencies {
  return {
    connect: vi.fn(async () => connection as never),
    createDrizzle: vi.fn(() => ({}) as never),
    migrate: vi.fn(async () => { throw migrationError; }),
    readMigrationFiles: vi.fn(() => [{ sql: [migrationSql], folderMillis: 123, hash: "hash-123", bps: false }]),
  };
}

describe("production database migration bootstrap", () => {
  it("enables migrations for a production DATABASE_URL by default", () => {
    expect(shouldRunProductionMigrations({ NODE_ENV: "production", DATABASE_URL: "mysql://example" })).toBe(true);
  });

  it("does not mutate development or explicitly disabled databases", () => {
    expect(shouldRunProductionMigrations({ NODE_ENV: "development", DATABASE_URL: "mysql://example" })).toBe(false);
    expect(shouldRunProductionMigrations({ NODE_ENV: "production", DATABASE_URL: "mysql://example", RUN_DB_MIGRATIONS: "false" })).toBe(false);
    expect(shouldRunProductionMigrations({ NODE_ENV: "production" })).toBe(false);
  });

  it("resolves the committed drizzle folder from the server working directory", () => {
    expect(getMigrationsFolder("/app")).toBe(path.resolve("/app", "drizzle"));
  });

  it("recognizes nested MySQL existing-table errors for recovery", () => {
    expect(isExistingTableMigrationError({ code: "DRIZZLE_QUERY_ERROR", cause: { code: "ER_TABLE_EXISTS_ERROR", errno: 1050 } })).toBe(true);
    expect(isExistingTableMigrationError({ code: "ER_DUP_ENTRY", errno: 1062 })).toBe(false);
  });

  it("ignores only duplicate schema statements during recovery", () => {
    expect(isIgnorableSchemaConflict({ code: "ER_TABLE_EXISTS_ERROR" }, "CREATE TABLE `disputes` (id int)")).toBe(true);
    expect(isIgnorableSchemaConflict({ code: "ER_DUP_FIELDNAME" }, "ALTER TABLE `users` ADD `walletBalance` decimal(15,2)")).toBe(true);
    expect(isIgnorableSchemaConflict({ code: "ER_DUP_ENTRY" }, "INSERT INTO users (openId) VALUES ('x')")).toBe(false);
    expect(isIgnorableSchemaConflict({ code: "ER_TABLE_EXISTS_ERROR" }, "ALTER TABLE `users` MODIFY COLUMN `name` text")).toBe(false);
  });

  it("strips TiDB-incompatible JSON array defaults only after the matching schema error", () => {
    const statement = "CREATE TABLE `pubg_accounts` (`galleryUrls` json NOT NULL DEFAULT ('[]'))";
    const rewritten = rewriteTiDbJsonDefaults({ code: "ER_PARSE_ERROR", errno: 1064 }, statement);
    expect(rewritten).toContain("`galleryUrls` json NOT NULL");
    expect(rewritten).not.toContain("DEFAULT");
    expect(rewriteTiDbJsonDefaults({ code: "ER_DUP_ENTRY", errno: 1062 }, statement)).toBe(statement);
    expect(rewriteTiDbJsonDefaults({ code: "ER_BLOB_CANT_HAVE_DEFAULT", errno: 1101 }, "CREATE TABLE `pubg_accounts` (`galleryUrls` json NOT NULL DEFAULT '[]')")).not.toContain("DEFAULT");
    expect(rewriteTiDbJsonDefaults({ code: "ER_PARSE_ERROR", errno: 1064 }, "CREATE TABLE `users` (`name` text)")).toBe("CREATE TABLE `users` (`name` text)");
  });

  it("runs the actual locked recovery path and journals a previously-created schema", async () => {
    const connection = makeRecoveryConnection();
    const dependencies = makeDependencies(connection, { code: "DRIZZLE_QUERY_ERROR", cause: { code: "ER_TABLE_EXISTS_ERROR", errno: 1050 } });

    const result = await withProductionEnv(() => ensureProductionDatabaseSchema(dependencies));

    expect(result).toMatchObject({ status: "ready", recovered: true });
    expect(dependencies.migrate).toHaveBeenCalledTimes(1);
    expect(dependencies.connect).toHaveBeenCalledTimes(2);
    expect(connection.query.mock.calls.some(([sql]) => String(sql).trim().startsWith("INSERT INTO `__drizzle_migrations`"))).toBe(true);
    expect(connection.end).toHaveBeenCalledTimes(2);
  });

  it("strips a TiDB-incompatible JSON default before journaling the migration", async () => {
    const jsonStatement = "CREATE TABLE `pubg_accounts` (`galleryUrls` json NOT NULL DEFAULT ('[]'))";
    const connection = makeRecoveryConnection(undefined, true);
    const dependencies = makeDependencies(connection, { code: "DRIZZLE_QUERY_ERROR", cause: { code: "ER_TABLE_EXISTS_ERROR", errno: 1050 } }, jsonStatement);

    const result = await withProductionEnv(() => ensureProductionDatabaseSchema(dependencies));

    expect(result).toMatchObject({ status: "ready", recovered: true });
    expect(connection.query.mock.calls.some(([sql]) => String(sql).trim().includes("`galleryUrls` json NOT NULL") && !String(sql).trim().includes("DEFAULT"))).toBe(true);
  });

  it("does not hide a non-ignorable SQL error during recovery", async () => {
    const databaseError = { code: "ER_DUP_ENTRY", errno: 1062 };
    const connection = makeRecoveryConnection(databaseError);
    const dependencies = makeDependencies(connection, { code: "ER_TABLE_EXISTS_ERROR", errno: 1050 });

    await expect(withProductionEnv(() => ensureProductionDatabaseSchema(dependencies))).rejects.toMatchObject(databaseError);
    expect(connection.end).toHaveBeenCalledTimes(2);
  });
});
