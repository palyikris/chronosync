import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { emailSchema } from "../lib/zodSchemas";
import { createEmailActionVerifier, readEmailAction, resumePasswordSetup } from "../utils/authActions";
import { Input } from "../components/shared/Input";

export function AuthActionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [action] = useState(() => readEmailAction(location.pathname, location.search));
  const [verify] = useState(() => createEmailActionVerifier(async credentials => {
    const result = credentials.token_hash
      ? await supabase.auth.verifyOtp({ token_hash: credentials.token_hash, type: credentials.type })
      : await supabase.auth.verifyOtp({ email: credentials.email!, token: credentials.token!, type: credentials.type });
    if (result.error) throw result.error;
    if (!result.data.session) throw new Error(t("auth.actionInvalid"));
    return result.data.session.user;
  }));
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [returnTo, setReturnTo] = useState(action.returnTo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() => action.valid ? null : t("auth.actionInvalid"));
  const inFlight = useRef(false);
  const needsPassword = action.type !== "email";

  useEffect(() => {
    // Capture the action in memory, then remove all credentials from the address
    // bar before the user activates it. This effect does not consume the token.
    window.history.replaceState(window.history.state, "", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (!needsPassword || action.tokenHash || !action.valid) return;
    let active = true;
    let restoredEmail = "";
    void resumePasswordSetup(window.history.state?.chronosyncPasswordSetup, action.type, async () => {
      const { data, error: identityError } = await supabase.auth.getUser();
      if (identityError) return null;
      restoredEmail = data.user?.email ?? "";
      return data.user?.id ?? null;
    }).then(progress => {
      if (!active || !progress) return;
      setVerifiedUserId(progress.userId);
      setVerifiedEmail(restoredEmail);
      setReturnTo(progress.returnTo);
    });
    return () => { active = false; };
  }, [action, needsPassword]);

  const continueAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      if (!action.valid) throw new Error(t("auth.actionInvalid"));
      const user = await verify(action.tokenHash
        ? { token_hash: action.tokenHash, type: action.type }
        : { email: emailSchema.parse(email).toLowerCase(), token: code.replace(/\s/g, ""), type: action.type });
      setVerifiedUserId(user.id);
      setVerifiedEmail(user.email ?? "");
      if (needsPassword) window.history.replaceState({ ...window.history.state,
        chronosyncPasswordSetup: { type: action.type, userId: user.id,
          returnTo: action.returnTo, verifiedAt: Date.now() },
      }, "", location.pathname);
      await queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      if (!needsPassword) navigate(action.returnTo, { replace: true });
    } catch {
      setError(t("auth.actionInvalid"));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (password.length < 8 || password !== confirmation) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const { data, error: identityError } = await supabase.auth.getUser();
      if (identityError || !verifiedUserId || data.user?.id !== verifiedUserId) throw new Error("Identity changed");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      window.history.replaceState({ ...window.history.state, chronosyncPasswordSetup: null }, "", location.pathname);
      setPassword("");
      setConfirmation("");
      await queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      navigate(returnTo, { replace: true });
    } catch {
      setError(t("auth.passwordUpdateFailed"));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return <div className="app-shell">
    <main className="auth-frame grid-cols-1! max-w-lg!">
      <section className="auth-card gap-5">
        <h1 className="auth-title text-2xl font-semibold">{t(verifiedUserId ? "auth.choosePassword" : "auth.actionTitle")}</h1>
        <p className="text-sm text-muted">{t(verifiedUserId ? "auth.choosePasswordHelp" : "auth.actionHelp")}</p>
        {error && <div className="auth-error" role="alert">{error}</div>}
        {!verifiedUserId ? <form className="space-y-4" onSubmit={continueAction}>
          {!action.tokenHash && <>
            <Input id="action-email" label={t("auth.emailLabel")} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            <Input id="action-code" label={t("auth.emailCode")} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" required value={code} onChange={e => setCode(e.target.value)} />
          </>}
          <button className="auth-button-primary" type="submit" disabled={busy || !action.valid}>{t(busy ? "common.loading" : "auth.verifyAndContinue")}</button>
        </form> : needsPassword ? <form className="space-y-4" onSubmit={savePassword}>
          <input className="sr-only" type="email" name="username" autoComplete="username" value={verifiedEmail} readOnly tabIndex={-1} aria-hidden="true" />
          <Input id="action-password" label={t("auth.newPassword")} type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} />
          <Input id="action-confirm-password" label={t("auth.confirmNewPassword")} type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={e => setConfirmation(e.target.value)} />
          <button className="auth-button-primary" type="submit" disabled={busy}>{t("auth.savePassword")}</button>
        </form> : null}
        <Link className="auth-link-button" to="/login">{t("common.signIn")}</Link>
      </section>
    </main>
  </div>;
}
