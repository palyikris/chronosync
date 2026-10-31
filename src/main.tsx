import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@fontsource-variable/inter/opsz.css";
import App from "./App";
import "./index.css";
import "./lib/i18n";

// A stale open tab can request a removed lazy chunk after a deployment.
// Recover once per build, without looping when the connection is unavailable.
window.addEventListener('vite:preloadError', (event) => {
  if (!import.meta.env.PROD || !navigator.onLine) return;
  const recoveryKey = `chronosync:chunk-recovery:${__APP_BUILD_ID__}`;
  try {
    if (sessionStorage.getItem(recoveryKey)) return;
    sessionStorage.setItem(recoveryKey, '1');
  } catch { return; }
  event.preventDefault();
  window.location.reload();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Cache queries for 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
