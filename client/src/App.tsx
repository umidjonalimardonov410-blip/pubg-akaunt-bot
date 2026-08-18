import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import GamerIntro from "./components/GamerIntro";
import LanguageSync from "./components/LanguageSync";
import PageSkeleton from "./components/PageSkeleton";
import { AutoTranslate } from "./lib/autoTranslate";

// Lazy-loading: og'ir sahifalar faqat kerak bo'lganda yuklanadi -> start tezroq.
const Home = lazy(() => import("./pages/Home"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/accounts"} component={Home} />
      <Route path={"/sell"} component={Home} />
      <Route path={"/orders"} component={Home} />
      <Route path={"/saved"} component={Home} />
      <Route path={"/referral"} component={Home} />
      <Route path={"/chats"} component={Home} />
      <Route path={"/notifications"} component={Home} />
      <Route path={"/chat/:id"} component={Home} />
      <Route path={"/order/:id"} component={Home} />
      <Route path={"/profile"} component={Home} />
      <Route path={"/transactions"} component={Home} />
      <Route path={"/reviews"} component={Home} />
      <Route path={"/support"} component={Home} />
      <Route path={"/rules"} component={Home} />

      <Route path={"/admin"} component={Home} />
      <Route path={"/account/:id"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - Temalar: dark (klassik), neon, gamer. Tanlov localStorage + profilga saqlanadi
//   (ThemePicker komponenti profil sahifasida).

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <GamerIntro />
          <AutoTranslate />
          <LanguageSync />
          <Suspense fallback={<PageSkeleton />}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
