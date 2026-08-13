import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ProTools from "./pages/ProTools";
import ProMarketplaceHub from "./pages/ProMarketplaceHub";

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
      <Route path={"/chat/:id"} component={Home} />
      <Route path={"/order/:id"} component={Home} />
      <Route path={"/profile"} component={Home} />
      <Route path={"/reviews"} component={Home} />
      <Route path={"/support"} component={Home} />
      <Route path={"/pro"} component={ProTools} />
      <Route path={"/pro-tools"} component={ProTools} />
      <Route path={"/pro-market"} component={ProMarketplaceHub} />
      <Route path={"/admin"} component={Home} />
      <Route path={"/account/:id"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
