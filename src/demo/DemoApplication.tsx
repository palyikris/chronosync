import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../context/authContextBase";
import { AppLayout } from "../components/shared/AppLayout";
import { PageLoading } from "../components/shared/PageLoading";
import { TimesheetPage } from "../pages/TimesheetPage";
import TimesheetReviewPage from "../pages/TimesheetReviewPage";
import { ClientBillingPage } from "../pages/ClientBillingPage";
import { supabase } from "../lib/supabaseClient";
import { DEMO_DATE, DEMO_PERIOD, DEMO_ORIGIN, demoProfile, demoTransport, demoUser } from "./demoTransport";
import { DEMO_ROUTES, isDemoRoute } from "./protocol";
import { demoParentOrigin, websiteUrl } from "./embedding";
import type { Session } from "@supabase/supabase-js";

function clearDemoPreferences() {
  try {
    const keys = Object.keys(window.localStorage).filter(key => key.startsWith("chronosync:") && key.includes(demoUser.id));
    keys.forEach(key => window.localStorage.removeItem(key));
  } catch {
    // The walkthrough still works when browser storage is unavailable.
  }
}

function createSessionToken() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: demoUser.id, aud: "authenticated", role: "authenticated", iss: `${DEMO_ORIGIN}/auth/v1`,
    exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000),
  })}.ZGVtby1zaWduYXR1cmU`;
}

function DemoRoutes({ queryClient }: { queryClient: QueryClient }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [revision, setRevision] = useState(0);
  const embedded = window.parent !== window;
  const hu = i18n.resolvedLanguage?.startsWith("hu");
  const reset = () => {
    clearDemoPreferences();
    demoTransport.reset();
    queryClient.clear();
    setRevision(value => value + 1);
    navigate("/timesheet", { replace: true });
  };

  useEffect(() => {
    const publish = () => {
      if (embedded) window.parent.postMessage({ type: "chronosync-demo-state", route: location.pathname,
        snapshot: demoTransport.snapshot() }, demoParentOrigin);
    };
    publish();
    window.scrollTo({ top: 0, behavior: "instant" });
    return demoTransport.subscribe(publish);
  }, [embedded, location.pathname]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!embedded || event.source !== window.parent || event.origin !== demoParentOrigin || !event.data || typeof event.data !== "object") return;
      if (event.data.type === "chronosync-demo-navigate" && isDemoRoute(event.data.route)) navigate(event.data.route);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [embedded, navigate]);

  useEffect(() => {
    if (!embedded) return;
    const interaction = () => window.parent.postMessage({ type: "chronosync-demo-interaction" }, demoParentOrigin);
    document.addEventListener("pointerdown", interaction, { passive: true });
    document.addEventListener("focusin", interaction);
    return () => {
      document.removeEventListener("pointerdown", interaction);
      document.removeEventListener("focusin", interaction);
    };
  }, [embedded]);

  return <>
    {!embedded ? <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg-accent px-4 py-3 text-xs text-muted lg:pl-[18.5rem]">
      <span>{hu ? "ChronoSync demó · kitalált adatok · nincs számlakiállítás vagy e-mail-küldés" : "ChronoSync demo · fictional data · no invoices issued or emails sent"}</span>
      <div className="flex flex-wrap items-center gap-4">{DEMO_ROUTES.map((route, index) => <button key={route} onClick={() => navigate(route)} className="font-medium text-primary-strong underline">{(hu ? ["Munkaidő", "Ellenőrzés", "Számlázás"] : ["Timesheets", "Review", "Billing"])[index]}</button>)}<button onClick={reset} className="font-medium underline">{hu ? "Újrakezdés" : "Start again"}</button><a href={`${websiteUrl.replace(/\/$/, "")}#demo`} className="underline">{hu ? "Vissza az oldalra" : "Back to the website"}</a></div>
    </div> : null}
    <Routes key={revision}>
      <Route element={<AppLayout />}>
        <Route path="/timesheet" element={<TimesheetPage initialDate={DEMO_DATE} />} />
        <Route path="/admin/review" element={<TimesheetReviewPage />} />
        <Route path="/admin/billing" element={<ClientBillingPage initialPeriod={DEMO_PERIOD} />} />
        <Route path="/" element={<Navigate to="/timesheet" replace />} />
        <Route path="*" element={<div className="rounded-2xl border border-border bg-surface p-6 text-sm"><h1 className="text-xl font-semibold">{hu ? "Folytasd a vezetett demót" : "Continue the guided demo"}</h1><p className="mt-3 text-muted">{hu ? "Ebben a demóban a munkaidőrögzítés, az ellenőrzés és az ügyfélszámlázás próbálható ki." : "This demo includes time entry, timesheet review, and client billing."}</p><button onClick={() => navigate("/timesheet")} className="mt-5 font-medium text-primary-strong underline">{hu ? "Vissza a munkaidőhöz" : "Return to Timesheets"}</button></div>} />
      </Route>
    </Routes>
  </>;
}

export default function DemoApplication() {
  const { i18n } = useTranslation();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: 0 },
  } }));

  useEffect(() => {
    let active = true;
    clearDemoPreferences();
    const language = new URLSearchParams(window.location.search).get("lang") === "hu" ? "hu" : "en";
    void i18n.changeLanguage(language);
    void supabase.auth.setSession({ access_token: createSessionToken(), refresh_token: "local-demo-only" }).then(({ data, error }) => {
      if (!active) return;
      if (error || !data.session) setError(error?.message ?? "Unable to load the demo.");
      else setSession(data.session);
    });
    return () => { active = false; };
  }, [i18n]);

  if (error) return <main className="p-8 text-sm text-danger" role="alert">{error}</main>;
  if (!session) return <PageLoading />;
  const initialRoute = new URLSearchParams(window.location.search).get("step");
  return <QueryClientProvider client={queryClient}>
    <AuthContext.Provider value={{ user: demoUser, profile: demoProfile, session, loading: false,
      isSuperAdmin: false, isCompanyAdmin: true, refreshProfile: async () => {}, signOut: async () => { window.location.reload(); } }}>
      <MemoryRouter initialEntries={[isDemoRoute(initialRoute) ? initialRoute : "/timesheet"]}>
        <DemoRoutes queryClient={queryClient} />
      </MemoryRouter>
    </AuthContext.Provider>
  </QueryClientProvider>;
}
