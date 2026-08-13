import { createConnection, type RowDataPacket } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { readMigrationFiles, type MigrationMeta } from "drizzle-orm/migrator";
import path from "node:path";

const MIGRATIONS_TABLE = "__drizzle_migrations";
const MIGRATION_LOCK_NAME = "inferno_stealth_schema_migrations";

/**
 * These are the tables represented by the committed schema. They are used only
 * by the recovery runner to distinguish an already-created schema from a
 * partially-created database that still needs normal migrations.
 */
const EXPECTED_TABLES = [
  "users",
  "pubg_accounts",
  "orders",
  "reviews",
  "transactions",
  "notifications",
  "disputes",
  "favorites",
  "chat_threads",
  "chat_messages",
  "admin_audit_logs",
  "recently_viewed",
  "referrals",
  "negotiations",
  "auctions",
  "auction_bids",
  "promo_codes",
  "support_tickets",
  "seller_verifications",
  "premium_promotions",
  "support_ticket_messages",
  "seller_badge_audits",
  "price_estimates",
  "price_evaluation_rules",
  "security_audits",
] as const;

type DatabaseErrorLike = {
  code?: string | number;
  errno?: string | number;
  message?: string;
  cause?: unknown;
};

type MigrationRow = RowDataPacket & {
  hash: string;
  created_at: number;
};

type MigrationConnection = Awaited<ReturnType<typeof createConnection>>;

export type MigrationDependencies = {
  connect: (databaseUrl: string) => Promise<MigrationConnection>;
  createDrizzle: typeof drizzle;
  migrate: typeof migrate;
  readMigrationFiles: typeof readMigrationFiles;
};

const defaultMigrationDependencies: MigrationDependencies = {
  connect: createConnection,
  createDrizzle: drizzle,
  migrate,
  readMigrationFiles,
};

export function getMigrationsFolder(cwd = process.cwd()) {
  return path.resolve(cwd, "drizzle");
}

export function shouldRunProductionMigrations(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === "production" && Boolean(env.DATABASE_URL) && env.RUN_DB_MIGRATIONS !== "false";
}

function errorCandidates(error: unknown): DatabaseErrorLike[] {
  const candidates: DatabaseErrorLike[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const candidate = current as DatabaseErrorLike;
    candidates.push(candidate);
    current = candidate.cause;
  }
  return candidates;
}

function hasErrorCode(error: unknown, codes: string[]) {
  return errorCandidates(error).some(candidate => {
    const code = String(candidate.code ?? candidate.errno ?? "");
    return codes.includes(code);
  });
}

/** Exported for focused tests; only schema-conflict errors are recoverable. */
export function isExistingTableMigrationError(error: unknown) {
  return hasErrorCode(error, ["ER_TABLE_EXISTS_ERROR", "1050"]);
}

/**
 * Duplicate schema statements can occur when a previous process created a
 * table/column/index and crashed before recording its migration journal row.
 * Data errors, constraint violations, and unknown SQL errors must still fail
 * startup rather than being hidden.
 */
export function isIgnorableSchemaConflict(error: unknown, statement: string) {
  const normalized = statement.trim().toUpperCase();
  if (hasErrorCode(error, ["ER_TABLE_EXISTS_ERROR", "1050"])) {
    return normalized.startsWith("CREATE TABLE");
  }
  if (hasErrorCode(error, ["ER_DUP_FIELDNAME", "1060"])) {
    return normalized.startsWith("ALTER TABLE") && normalized.includes(" ADD ");
  }
  if (hasErrorCode(error, ["ER_DUP_KEYNAME", "ER_DUP_INDEX", "1061"])) {
    return normalized.startsWith("ALTER TABLE") || normalized.startsWith("CREATE INDEX");
  }
  return false;
}

/**
 * TiDB rejects MySQL's parenthesized JSON string defaults in some versions
 * (for example DEFAULT ('[]')). Keep the compatibility rewrite deliberately
 * narrow and activate it only after TiDB reports a parse error.
 */
export function rewriteTiDbJsonDefaults(error: unknown, statement: string) {
  if (!hasErrorCode(error, ["ER_PARSE_ERROR", "1064"])) return statement;
  return statement.replace(
    /(`(?:featuredSkins|galleryUrls)`\s+json\s+NOT NULL\s+)DEFAULT\s*\(\s*'\[\]'\s*\)/gi,
    "$1DEFAULT '[]'",
  );
}

function migrationTableCreateSql() {
  return `CREATE TABLE IF NOT EXISTS \`${MIGRATIONS_TABLE}\` (\n    id serial primary key,\n    hash text not null,\n    created_at bigint\n  )`;
}

async function acquireMigrationLock(connection: Awaited<ReturnType<typeof createConnection>>) {
  const [rows] = await connection.query<RowDataPacket[]>("SELECT GET_LOCK(?, 60) AS lock_result", [MIGRATION_LOCK_NAME]);
  if (Number(rows[0]?.lock_result) !== 1) {
    throw new Error("Timed out waiting for the production database migration lock");
  }
}

async function releaseMigrationLock(connection: Awaited<ReturnType<typeof createConnection>>) {
  try {
    await connection.query("SELECT RELEASE_LOCK(?)", [MIGRATION_LOCK_NAME]);
  } catch (error) {
    console.warn("[Database] Could not release migration lock:", error);
  }
}

async function withMigrationConnection<T>(
  databaseUrl: string,
  work: (connection: MigrationConnection) => Promise<T>,
  connect: MigrationDependencies["connect"],
) {
  const connection = await connect(databaseUrl);
  await acquireMigrationLock(connection);
  try {
    return await work(connection);
  } finally {
    await releaseMigrationLock(connection);
    await connection.end();
  }
}

async function listExistingTables(connection: Awaited<ReturnType<typeof createConnection>>) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_NAME IN (${EXPECTED_TABLES.map(() => "?").join(", ")})`,
    [...EXPECTED_TABLES],
  );
  return new Set(rows.map(row => String(row.TABLE_NAME)));
}

async function readAppliedMigrations(connection: Awaited<ReturnType<typeof createConnection>>) {
  const [rows] = await connection.query<MigrationRow[]>(
    `SELECT hash, created_at FROM \`${MIGRATIONS_TABLE}\` ORDER BY created_at ASC`,
  );
  return rows;
}

async function recoverExistingSchema(
  connection: MigrationConnection,
  migrationsFolder: string,
  readMigrations: MigrationDependencies["readMigrationFiles"],
) {
  await connection.query(migrationTableCreateSql());
  const existingTables = await listExistingTables(connection);
  const missingTables = EXPECTED_TABLES.filter(tableName => !existingTables.has(tableName));
  if (missingTables.length > 0) {
    throw new Error(`Migration recovery refused: production schema is incomplete; missing tables: ${missingTables.join(", ")}`);
  }

  const migrations = readMigrations({ migrationsFolder });
  const appliedRows = await readAppliedMigrations(connection);
  const appliedHashes = new Set(appliedRows.map(row => String(row.hash)));
  const appliedTimestamps = new Set(appliedRows.map(row => Number(row.created_at)));

  for (const migration of migrations) {
    if (appliedHashes.has(migration.hash) || appliedTimestamps.has(migration.folderMillis)) {
      continue;
    }

    for (const statement of migration.sql) {
      const normalized = statement.trim();
      if (!normalized) continue;
      try {
        await connection.query(normalized);
      } catch (error) {
        const compatibleStatement = rewriteTiDbJsonDefaults(error, normalized);
        if (compatibleStatement !== normalized) {
          try {
            await connection.query(compatibleStatement);
            console.warn(`[Database] Rewrote TiDB-incompatible JSON default in ${migration.folderMillis}`);
            continue;
          } catch (retryError) {
            error = retryError;
          }
        }
        if (!isIgnorableSchemaConflict(error, normalized)) {
          throw error;
        }
        console.warn(`[Database] Ignoring already-applied schema statement in ${migration.folderMillis}`);
      }
    }

    await connection.query(
      `INSERT INTO \`${MIGRATIONS_TABLE}\` (hash, created_at) VALUES (?, ?)`,
      [migration.hash, migration.folderMillis],
    );
  }

  return migrations.at(-1);
}

/**
 * Apply committed Drizzle migrations before the production server accepts
 * traffic. A normal Drizzle run is used first. If an earlier process created
 * schema objects but died before writing its journal row, a second, locked
 * recovery pass replays only unapplied migration files and ignores narrowly
 * classified duplicate schema statements.
 */
export async function ensureProductionDatabaseSchema(
  dependencies: Partial<MigrationDependencies> = {},
) {
  if (!shouldRunProductionMigrations()) {
    return { status: "skipped" as const, migrationsFolder: getMigrationsFolder() };
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return { status: "skipped" as const, migrationsFolder: getMigrationsFolder() };
  }

  const migrationsFolder = getMigrationsFolder();
  const runtime = { ...defaultMigrationDependencies, ...dependencies };
  try {
    await withMigrationConnection(databaseUrl, async connection => {
      await runtime.migrate(runtime.createDrizzle(connection), { migrationsFolder });
    }, runtime.connect);
    console.log(`[Database] Production migrations applied from ${migrationsFolder}`);
    return { status: "ready" as const, migrationsFolder };
  } catch (error) {
    if (!isExistingTableMigrationError(error)) {
      throw error;
    }

    console.warn("[Database] Detected an existing-table migration conflict; starting locked recovery pass");
    const latestMigration = await withMigrationConnection(
      databaseUrl,
      connection => recoverExistingSchema(connection, migrationsFolder, runtime.readMigrationFiles),
      runtime.connect,
    );
    console.log(`[Database] Production migration recovery completed through ${latestMigration?.folderMillis ?? "none"}`);
    return { status: "ready" as const, migrationsFolder, recovered: true };
  }
}
