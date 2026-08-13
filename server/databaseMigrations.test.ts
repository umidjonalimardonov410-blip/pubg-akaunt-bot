import path from "node:path";
import { describe, expect, it } from "vitest";
import { getMigrationsFolder, shouldRunProductionMigrations } from "./databaseMigrations";

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
});
