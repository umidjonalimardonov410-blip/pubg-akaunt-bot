import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import { initPremiumUx } from "./lib/premium";
import { authenticateTelegramWebApp, exchangeTelegramLoginToken, getTelegramWebApp, readTelegramLoginToken } from "./lib/telegram";
import "./index.css";
import "./green.css";

const queryClient = new QueryClient();
const redirectToLoginIfUnauthorized = (error: unknown) => {
 if (!(error instanceof TRPCClientError)) return;
 if (typeof window === "undefined") return;
 const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
 if (!isUnauthorized) return;
 if (getTelegramWebApp()?.initData) return;
 console.warn("Unauthorized session - please open via Telegram bot");
};
queryClient.getQueryCache().subscribe(event => {
 if (event.type === "updated" && event.action.type === "error") {
  redirectToLoginIfUnauthorized(event.query.state.error);
  console.error("[API Query Error]", event.query.state.error);
 }
});
queryClient.getMutationCache().subscribe(event => {
 if (event.type === "updated" && event.action.type === "error") {
  redirectToLoginIfUnauthorized(event.mutation.state.error);
  console.error("[API Mutation Error]", event.mutation.state.error);
 }
});
const trpcClient = trpc.createClient({ links: [httpBatchLink({
 url: "/api/trpc", transformer: superjson,
 headers() {
  try {
   const raw = sessionStorage.getItem("manus-cookie");
   if (raw) {
    const prefix = `${COOKIE_NAME}=`;
    const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
    const token = pair?.trim().slice(prefix.length);
    if (token) return { Authorization: `Bearer ${token}` };
   }
  } catch {}
  return {};
 },
 fetch(input, init) { return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" }); }
})] });
async function bootstrapTelegramAuth() {
 const loginToken = readTelegramLoginToken();
 if (loginToken) {
  const result = await exchangeTelegramLoginToken(loginToken);
  if (result.ok && typeof window !== "undefined") {
   const url = new URL(window.location.href);
   url.searchParams.delete("tglogin");
   window.history.replaceState({}, "", url.toString());
  }
  if (result.ok) return;
 }
 const webApp = getTelegramWebApp();
 if (!webApp?.initData || !webApp.initDataUnsafe?.user?.id) return;
 await authenticateTelegramWebApp(webApp);
}
initPremiumUx();
void bootstrapTelegramAuth().finally(() => {
 const root = document.getElementById("root");
 if (!root) return;
 createRoot(root).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
   <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
  </trpc.Provider>
 );
});
