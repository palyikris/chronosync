import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { signInUser } from "../services/authService";
import { useAuth } from "../context/useAuth";
import { getHomeRouteForRole } from "../utils/navigation";

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
      <div className="app-shell px-4 py-8">
        <main className="w-full max-w-md">
          <section className="auth-card flex min-h-112 items-center justify-center p-8 md:p-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="auth-brand-badge bg-primary text-primary-foreground">
                <span
                  className="material-symbols-outlined text-[28px]"
                  aria-hidden="true"
                >
                  schedule
                </span>
              </div>
              <div className="space-y-2">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
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
    <div className="app-shell px-4 py-8">
      <main className="w-full max-w-md">
        <section className="auth-card p-8 md:p-10">
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <div className="auth-brand-badge bg-primary text-primary-foreground">
              <span
                className="material-symbols-outlined text-[28px]"
                aria-hidden="true"
              >
                schedule
              </span>
            </div>
            <h1 className="auth-title text-3xl font-bold tracking-tight text-text">
              ChronoSync
            </h1>
            <p className="auth-subtitle text-sm text-muted">
              {t("auth.brandSubtitle")}
            </p>
          </div>

          <div className="mb-8 text-center">
            <h2 className="auth-title text-2xl font-normal leading-8 text-text">
              {t("auth.signInTitle")}
            </h2>
            <p className="auth-subtitle mt-1 text-sm leading-5 text-muted">
              {t("auth.signInSubtitle")}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            {errorMsg && <div className="auth-error">{errorMsg}</div>}

            <div className={`auth-field ${email ? "has-value" : ""}`}>
              <span
                className="material-symbols-outlined auth-field-icon"
                aria-hidden="true"
              >
                mail
              </span>
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
              <span
                className="material-symbols-outlined auth-field-icon"
                aria-hidden="true"
              >
                lock
              </span>
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
                <span
                  className="material-symbols-outlined text-[20px]"
                  aria-hidden="true"
                >
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="auth-button-primary bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>
                  {loading ? t("common.signingIn") : t("common.signIn")}
                </span>
                <span
                  className="material-symbols-outlined text-[20px]"
                  aria-hidden="true"
                >
                  arrow_forward
                </span>
              </button>

              <div className="flex justify-center">
                <button
                  type="button"
                  className="auth-link-button px-4 py-2 text-sm font-medium text-primary-strong transition hover:underline"
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-12 text-center">
            <p className="text-sm leading-5 text-muted-strong">
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

        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted opacity-60">
          <span>{t("common.version")}</span>
        </div>
      </main>
    </div>
  );
};
