import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL?.trim();

function MissingEnvApp() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Configuration Required
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Add your local Convex environment before starting the app.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          This project expects a .env.local file with VITE_CONVEX_URL. Without
          it, the frontend cannot connect to Convex and would otherwise fail at
          startup.
        </p>
        <div className="mt-6 rounded-xl bg-muted p-4">
          <pre className="whitespace-pre-wrap break-all text-sm text-muted-foreground">
            VITE_CONVEX_URL=https://your-deployment.convex.cloud
          </pre>
        </div>
        <p className="mt-6 text-sm leading-6 text-muted-foreground">
          If this workspace was already configured previously, restore or create
          .env.local in the project root and restart the dev server. For Vercel
          deployments, add the same VITE_CONVEX_URL variable in your project
          environment settings before redeploying.
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {convexUrl ? (
      <ConvexAuthProvider client={new ConvexReactClient(convexUrl)}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConvexAuthProvider>
    ) : (
      <MissingEnvApp />
    )}
  </StrictMode>,
);
