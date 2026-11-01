import { DEMO_ORIGIN, demoTransport } from "../demo/demoTransport";

// Only the dedicated demo document uses fictional data. MemoryRouter changes
// its displayed app pages without changing this pathname. Normal app routes
// keep their existing credentials, auth provider, and network transport.
export const isDemoDocument = typeof window !== "undefined" && window.location.pathname === "/demo";
export const serviceFetch: typeof fetch = isDemoDocument
  ? demoTransport.fetch
  : (input, init) => globalThis.fetch(input, init);
export const apiBaseUrl = isDemoDocument ? `${DEMO_ORIGIN}/api` : import.meta.env.VITE_API_BASE_URL;
export const supabaseEndpoint = isDemoDocument ? DEMO_ORIGIN : import.meta.env.VITE_SUPABASE_URL;
export const supabasePublicKey = isDemoDocument ? "demo-publishable-key" : import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
