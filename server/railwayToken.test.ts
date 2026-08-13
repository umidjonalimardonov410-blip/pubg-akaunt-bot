import { describe, expect, it } from "vitest";

describe("Railway deployment credential", () => {
  it.skipIf(!process.env.RAILWAY_TOKEN)("is accepted by Railway's lightweight GraphQL health query", async () => {
    const token = process.env.RAILWAY_TOKEN;
    expect(token, "RAILWAY_TOKEN must be supplied for this credential check").toBeTruthy();

    const response = await fetch("https://backboard.railway.app/graphql/v2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "query { me { id } }" }),
    });

    const body = await response.json() as { data?: { me?: { id?: string } }; errors?: unknown[] };
    expect(response.ok).toBe(true);
    expect(body.errors ?? []).toHaveLength(0);
    expect(body.data?.me?.id).toBeTruthy();
  }, 15_000);
});
