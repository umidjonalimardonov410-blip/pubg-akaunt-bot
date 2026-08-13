import { describe, expect, it } from "vitest";

describe("Railway deployment credential", () => {
  it("authenticates against the Railway GraphQL API", async () => {
    const token = process.env.RAILWAY_TOKEN;
    expect(token, "RAILWAY_TOKEN must be configured for deployment validation").toBeTruthy();

    const response = await fetch("https://backboard.railway.com/graphql/v2", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ query: "query { me { id } }" }),
    });
    const body = await response.json() as { errors?: Array<{ message?: string }>; data?: { me?: { id?: string } } };
    const errorText = body.errors?.map(error => error.message ?? "").join(" ") ?? "";

    expect(response.status).toBe(200);
    expect(errorText.toLowerCase()).not.toMatch(/invalid token|unauthorized|not authenticated/);
    expect(body.data?.me?.id || body.errors?.length).toBeTruthy();
  }, 15_000);
});
