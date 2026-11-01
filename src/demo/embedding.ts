import { resolveDemoParentOrigin } from "./originPolicy";
function configuredWebsite() {
  const fallback = import.meta.env.DEV ? "http://127.0.0.1:5173" : "https://example.com";
  try {
    const url = new URL(String(import.meta.env.VITE_MARKETING_SITE_URL || fallback));
    return !url.username && !url.password && (url.protocol === "https:" || import.meta.env.DEV && url.protocol === "http:") ? url.origin : fallback;
  } catch { return fallback; }
}
export const websiteUrl = configuredWebsite();
export const demoParentOrigin = resolveDemoParentOrigin(new URLSearchParams(window.location.search).get("parentOrigin"), window.location.origin, websiteUrl, import.meta.env.DEV);
