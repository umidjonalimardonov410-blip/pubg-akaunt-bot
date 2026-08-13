import path from "path";
import { describe, expect, it } from "vitest";
import { getStaticDistPath } from "./_core/vite";

describe("production static serving", () => {
  it("resolves the Vite output directory under dist/public", () => {
    expect(getStaticDistPath("/app")).toBe(path.resolve("/app", "dist", "public"));
  });

  it("uses the project working directory when no root is provided", () => {
    expect(getStaticDistPath()).toBe(
      path.resolve(process.cwd(), "dist", "public")
    );
  });
});
