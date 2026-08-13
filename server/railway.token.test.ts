import { describe, expect, it } from "vitest";

const RAILWAY_API = "https://backboard.railway.com/graphql/v2";

type GraphQLResponse = {
  data?: Record<string, unknown>;
  errors?: Array<{ message?: string }>;
};

async function railwayQuery(query: string, headers: Record<string, string>) {
  const response = await fetch(RAILWAY_API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ query }),
  });

  let body: GraphQLResponse = {};
  try {
    body = (await response.json()) as GraphQLResponse;
  } catch {
    body = {};
  }

  return { response, body };
}

describe("Railway credential validation", () => {
  it(
    "accepts an account, workspace, or project token",
    async () => {
      const token = process.env.RAILWAY_TOKEN;
      expect(token, "RAILWAY_TOKEN must be supplied for this validation test").toBeTruthy();

      const account = await railwayQuery("query { me { id } }", {
        Authorization: `Bearer ${token}`,
      });
      if (account.response.ok && account.body.data?.me) return;

      const workspace = await railwayQuery(
        "query { projects { edges { node { id } } } }",
        { Authorization: `Bearer ${token}` },
      );
      if (workspace.response.ok && workspace.body.data?.projects) return;

      const project = await railwayQuery(
        "query { projectToken { projectId environmentId } }",
        { "Project-Access-Token": token as string },
      );

      expect(
        project.response.ok && project.body.data?.projectToken,
        `Railway token validation failed: ${[
          ...(account.body.errors ?? []),
          ...(workspace.body.errors ?? []),
          ...(project.body.errors ?? []),
        ]
          .map((error) => error.message)
          .filter(Boolean)
          .join("; ") || "the API rejected all supported token headers"}`,
      ).toBeTruthy();
    },
    15_000,
  );
});
