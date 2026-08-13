import { describe, expect, it } from "vitest";

describe("GitHub deployment credential", () => {
  it("authenticates and can read the target repository metadata", async () => {
    const token = process.env.GITHUB_TOKEN;
    expect(token, "GITHUB_TOKEN must be configured for this validation").toBeTruthy();

    const response = await fetch(
      "https://api.github.com/repos/umidjonalimardonov410-blip/pubg-akaunt-bot",
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "inferno-stealth-deployment-check",
        },
      }
    );

    expect(response.ok).toBe(true);
    const repository = (await response.json()) as {
      full_name?: string;
      permissions?: { push?: boolean };
    };
    expect(repository.full_name).toBe(
      "umidjonalimardonov410-blip/pubg-akaunt-bot"
    );
    expect(repository.permissions?.push).toBe(true);
  }, 20_000);
});
