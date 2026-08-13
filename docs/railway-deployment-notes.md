# Railway deployment verification notes

Validated on 2026-08-13 for the tested GitHub revision `83ff6d5206ee561947a08999d2b4b141b197e002`.

The supplied `RAILWAY_TOKEN` authenticates successfully against the official Railway GraphQL endpoint at `https://backboard.railway.com/graphql/v2` using `query { me { id } }`. The project’s lightweight Vitest credential check passes.

The Railway CLI (`@railway/cli` 5.40.0) still reports `Invalid RAILWAY_TOKEN`, indicating the configured secret is a user/API token that the CLI cannot use for the current linked-resource operation, or it lacks the required project scope. The authenticated GraphQL `projects { edges { node { id name services { edges { node { id name } } } } } }` query returns an empty project list. Therefore no Railway project/service identifier is available in the current token scope for a direct deploy trigger.

The public Railway URL `https://inferno-stealth-production.up.railway.app` returns HTTP 200 and the expected title `Inferno Stealth — PUBG akkaunt bozori`. Its asset fingerprint currently differs from the local build fingerprint, so the public Railway service has not been proven to contain revision `83ff6d5` yet. Do not report this revision as Railway-live until a correctly scoped Railway project/service token or a GitHub-connected Railway auto-deploy is confirmed.
