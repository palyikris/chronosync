/** A supplied parentOrigin is a request, never an authorization. */
export function resolveDemoParentOrigin(requested: string | null, appOrigin: string, websiteUrl: string, development: boolean) {
  const allowed = new Set([appOrigin]);
  try {
    const site = new URL(websiteUrl);
    if (!site.username && !site.password && (site.protocol === "https:" || development && site.protocol === "http:")) allowed.add(site.origin);
  } catch { /* No configured website. */ }
  if (development) { allowed.add("http://127.0.0.1:5173"); allowed.add("http://localhost:5173"); }
  return requested && allowed.has(requested) ? requested : appOrigin;
}
