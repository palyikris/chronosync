function appBase() {
  const value = String(import.meta.env.VITE_CHRONOSYNC_APP_URL ?? "").trim();
  const fallback = import.meta.env.DEV ? "http://127.0.0.1:5174" : "https://app.example.com";
  try {
    const url = new URL(value || fallback);
    if (url.username || url.password || !["https:", ...(import.meta.env.DEV ? ["http:"] : [])].includes(url.protocol)) return new URL(fallback);
    return new URL(url.origin);
  } catch { return new URL(fallback); }
}
export const appOrigin = appBase().origin;
export const appLoginUrl = new URL("/login", appOrigin).href;
export function appDemoUrl(language: "en" | "hu", embedded = false) {
  const url = new URL("/demo", appOrigin); url.searchParams.set("lang", language);
  if (embedded) url.searchParams.set("parentOrigin", window.location.origin);
  return url.href;
}
