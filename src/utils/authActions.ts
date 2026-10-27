export type EmailActionType = "invite" | "email" | "recovery";

const hasUnsafeCharacters = (value: string) => [...value].some(char =>
  char === "\\" || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);

export function safeAuthContinuation(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || hasUnsafeCharacters(value)) return "/";
  try {
    const url = new URL(value, "https://chronosync.invalid");
    let path = url.pathname;
    for (let i = 0; i < 3; i += 1) path = decodeURIComponent(path);
    if (url.origin !== "https://chronosync.invalid" || path.startsWith("//") || hasUnsafeCharacters(path)
      || /^\/(?:auth(?:\/|$)|login(?:\/|$))/i.test(path)) return "/";
    // Nested return parameters cannot introduce a second external continuation.
    for (const key of ["returnTo", "redirect_to"]) {
      if (url.searchParams.has(key)) url.searchParams.set(key, safeAuthContinuation(url.searchParams.get(key)));
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/"; }
}

export function readEmailAction(path: string, search: string) {
  const type: EmailActionType = path === "/auth/invite" ? "invite" : path === "/auth/recover" ? "recovery" : "email";
  const query = new URLSearchParams(search);
  const tokenHash = query.get("token_hash");
  const valid = !tokenHash || (query.getAll("token_hash").length === 1 && query.getAll("type").length === 1
    && query.get("type") === type && /^[A-Za-z0-9_-]{20,2048}$/.test(tokenHash));
  return { type, tokenHash, valid, returnTo: safeAuthContinuation(query.get("returnTo") ?? query.get("redirect_to")) };
}

// Created once per action page. Rendering, GETs, and prefetch never invoke verify.
// A double click shares the request; an explicit retry is possible after failure.
export function createEmailActionVerifier<T>(verify: (credentials: {
  token_hash?: string; email?: string; token?: string; type: EmailActionType;
}) => Promise<T>) {
  let pending: Promise<T> | null = null;
  return (credentials: Parameters<typeof verify>[0]) => {
    pending ??= verify(credentials).catch(error => { pending = null; throw error; });
    return pending;
  };
}

export interface PasswordSetupProgress {
  type: "invite" | "recovery";
  userId: string;
  returnTo: string;
  verifiedAt: number;
}

// History stores only UI progress. The current verified Auth identity must still
// match; this marker never creates a session or authorizes a password update.
export async function resumePasswordSetup(
  value: unknown,
  type: EmailActionType,
  currentUserId: () => Promise<string | null>,
  now = Date.now(),
): Promise<PasswordSetupProgress | null> {
  if (!value || typeof value !== "object" || type === "email") return null;
  const progress = value as Partial<PasswordSetupProgress>;
  if (progress.type !== type || typeof progress.userId !== "string" || !progress.userId
    || typeof progress.verifiedAt !== "number" || !Number.isFinite(progress.verifiedAt)
    || progress.verifiedAt > now || now - progress.verifiedAt > 30 * 60 * 1000) return null;
  try {
    if (await currentUserId() !== progress.userId) return null;
    return { type, userId: progress.userId, verifiedAt: progress.verifiedAt,
      returnTo: safeAuthContinuation(typeof progress.returnTo === "string" ? progress.returnTo : null) };
  } catch { return null; }
}
