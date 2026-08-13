# Live UI Synchronization Findings

Date checked: 2026-08-13.

The Railway Mini App URL configured in the local environment is `https://inferno-stealth-production.up.railway.app`. Opening `/accounts` showed the previous deployed interface: the navigation still contained `Pro markaz` and `Pro vositalar`, and the layout buttons still had the old labels `Katak ko'rinishi` and `Ro'yxat ko'rinishi`.

After selecting the deployed list button, the live Railway page displayed the old expanded horizontal list cards. Each card showed an image-free wide row with name, level/rank/region, K/D, win rate, skins, price, and `Ko'rish`, but it did not show the new compact five-row treatment.

Local development, by contrast, rendered the new compact 5-row component and the updated toggle labels at 375px. The local repository HEAD was `c1de086`, while the configured GitHub repository `umidjonalimardonov410-blip/pubg-akaunt-bot` reported a different `main` commit (`2d0243fe2c851215070dd9e708bcdad226ccc23d`) and the local Git remote is an internal WebDev remote rather than the GitHub URL. This establishes that the Railway bot is serving an older source/deployment than the local workspace and that a direct GitHub synchronization step remains necessary.

## Local Interactive Verification

The local `/accounts` page exposed the updated button hints `3 ta ustunli ko'rinish` and `5 qatorli ixcham ko'rinish`. Clicking the compact button switched each listing into a dense card with a header row, then explicit `Daraja`, `Statistika`, `Skinlar`, and `Narx` rows, plus the `Ko‘rish` action. The extracted content confirmed Level/rank/region, K/D, Win Rate, match count, all demo skins, and price are present. The local preview showed no horizontal overflow at 375px; the full page extends vertically as expected for multiple listings.

The local test/build command completed successfully with 52 passing tests, 2 intentionally skipped integration tests, and a successful Vite/esbuild production build.

## Post-GitHub-Push Railway Check — 2026-08-13

The public Railway URL `https://inferno-stealth-production.up.railway.app/accounts` was checked after GitHub main moved to commit `c73595b`. It still rendered the previous build, including `Pro markaz` and `Pro vositalar` navigation, while the compact toggle remained the old behavior. This proves the Railway service did not automatically redeploy from the GitHub push. The sandbox has a `RAILWAY_TOKEN` environment variable, but the Railway CLI rejected it as invalid; no Railway project/service identifier is available in the environment, and no Railway connector is configured in the current Manus session.

## Railway API Scope Check — 2026-08-13

Railway's official API documentation confirms that account/workspace tokens use `Authorization: Bearer`, while project tokens use the `Project-Access-Token` header. The supplied token returns a valid `me` response under the account-token header, but the project list is empty and the CLI cannot authenticate it for project operations. GraphQL introspection confirms the available `projectToken`, `projects`, `deployments`, `service`, `serviceInstance`, and `railwayDomainByName` operations, but no public-domain-to-project lookup was found that bypasses resource authorization. A project-scoped token or authorized project/service identifiers are therefore still required for a targeted redeploy; the public domain alone does not expose them.

## Railway Target Discovered — 2026-08-13

The authorized Railway account token exposes workspace `b7e77708-fb95-41a7-b84f-bb7d36a358be`. In that workspace, project `Inferno Stealth` is `fc14404a-18b9-4a0d-9a4e-0d836c246b01`, the production environment is `a704ecfe-cf08-42be-a1d4-8edac4e69065`, and the application service `inferno-stealth` is `e340798f-80c9-4a6d-b326-d122a8044ded`. Its Railway domain is `inferno-stealth-production.up.railway.app`, and the latest successful deployment is `3dddf9fc-c7be-409f-af7a-1e15e8417ea0` from `2026-08-13T11:01:50.664Z`. The service instance is `feed5b31-d097-4f6d-903a-5a30f600180c`.

The targeted redeploy was triggered through Railway GraphQL and returned `serviceInstanceDeploy: true`. New deployment `205ea24e-f5b0-4e43-b680-770c772ca3ce` pulled GitHub `main` at commit `e708aa5b5f67cb8e20c0438e05391da1538e0d1a`. Its logs show `Starting Container`, `Server running on http://localhost:8080/`, OAuth initialization, and `[Telegram] commands=true menu=true webhook=true status=active` at `2026-08-13T15:31:42Z`. The API status was still reported as `BUILDING` during polling even though the container was running, so public HTTP/UI verification remains necessary.

After deployment `ced0a6f2-50d0-4518-8ea7-e3491fbb6dc6` reached `SUCCESS` on commit `c73595ba34c41c42190053f75bb87cc7764e474c`, the public Railway hostname was checked at both `/accounts` and `/`. Both returned a plain `Not Found` page with no app elements. This confirms the new commit is targeted and built, but the public service is currently not serving the SPA route; do not claim the UI is live until this routing/runtime issue is diagnosed and fixed.
