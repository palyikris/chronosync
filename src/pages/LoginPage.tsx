import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { signInUser } from "../services/authService";
import { useAuth } from "../context/useAuth";
import { getHomeRouteForRole } from "../utils/navigation";
import { ArrowRight, Clock3, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!authLoading && user && profile) {
      navigate(getHomeRouteForRole(profile.role), { replace: true });
    }
  }, [authLoading, navigate, profile, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await signInUser(email, password);
      // Success! AuthContext listener will detect the session change and redirect automatically.
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : t("auth.invalidCredentials"),
      );
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="app-shell">
        <main className="auth-frame grid-cols-1!">
          <section className="auth-card min-h-[32rem] items-center text-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="auth-brand-badge">
                <img src="/logo.png" alt="" className="chronosync-logo h-9 w-9 object-contain" />
              </div>
              <div className="space-y-2">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary-strong" />
                <p className="auth-subtitle text-sm text-muted">
                  {t("common.loadingAccount")}
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="auth-frame">
        <section className="auth-showcase" aria-hidden="true">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400 shadow-[inset_0_0_0_0.5px_rgba(91,104,66,0.16)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[inset_0_0_0_0.5px_rgba(91,104,66,0.13)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[inset_0_0_0_0.5px_rgba(91,104,66,0.12)]" />
            </div>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="" className="chronosync-logo h-7 w-7 object-contain" />
              <p className="text-[13px] font-semibold tracking-[-0.015em]">ChronoSync</p>
            </div>
          </div>

          <div className="relative z-10 max-w-md pb-10">
            <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/35 shadow-[0_1px_2px_rgba(75,87,57,0.05)] backdrop-blur-sm">
              <Clock3 className="h-7 w-7 text-primary-strong" />
            </div>
            <h2 className="max-w-sm text-[2rem] font-semibold leading-[1.12] tracking-[-0.035em]">
              {t("auth.brandSubtitle")}
            </h2>
            <p className="mt-4 max-w-sm text-[13px] leading-5 text-muted-strong">
              {t("auth.signInSubtitle")}
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-[11px] font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-strong/60" />
            <span>{t("common.version")}</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="mb-8 md:hidden">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="auth-brand-badge">
                <img src="/logo.png" alt="" className="chronosync-logo h-9 w-9 object-contain" />
              </div>
              <h1 className="text-base font-semibold tracking-tight">ChronoSync</h1>
            </div>
          </div>

          <div className="mb-7">
            <p className="mb-2 text-[11px] font-semibold tracking-[0.02em] text-primary-strong">
              ChronoSync
            </p>
            <h1 className="auth-title text-2xl font-semibold leading-tight tracking-[-0.035em] text-text">
              {t("auth.signInTitle")}
            </h1>
            <p className="auth-subtitle mt-2 text-[13px] leading-5 text-muted">
              {t("auth.signInSubtitle")}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {errorMsg && <div className="auth-error">{errorMsg}</div>}

            <div className={`auth-field ${email ? "has-value" : ""}`}>
              <Mail className="auth-field-icon h-[18px] w-[18px]" aria-hidden="true" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                autoComplete="email"
                className="auth-input"
              />
              <label htmlFor="email">{t("auth.emailLabel")}</label>
            </div>

            <div className={`auth-field ${password ? "has-value" : ""}`}>
              <LockKeyhole className="auth-field-icon h-[18px] w-[18px]" aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                autoComplete="current-password"
                className="auth-input pr-12"
              />
              <label htmlFor="password">{t("auth.passwordLabel")}</label>
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="auth-field-action"
                aria-label={
                  showPassword ? t("auth.hidePassword") : t("auth.showPassword")
                }
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="auth-button-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>
                  {loading ? t("common.signingIn") : t("common.signIn")}
                </span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              <div className="flex justify-center">
                <button
                  type="button"
                  className="auth-link-button px-3 py-2 text-[12px] font-medium text-primary-strong transition hover:underline"
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-7 border-t border-border pt-5 text-center">
            <p className="text-[12px] leading-5 text-muted-strong">
              {t("auth.dontHaveAccount")}{" "}
              <a
                className="font-semibold text-primary-strong hover:underline"
                href="#"
              >
                {t("auth.contactAdmin")}
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
