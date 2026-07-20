import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInUser } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { getHomeRouteForRole } from "../utils/navigation";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

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
      setErrorMsg(err instanceof Error ? err.message : "Invalid email or password.");
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
                <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
                  schedule
                </span>
              </div>
              <div className="space-y-2">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                <p className="auth-subtitle text-sm text-muted">Loading your account...</p>
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
              <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
                schedule
              </span>
            </div>
            <h1 className="auth-title text-3xl font-bold tracking-tight text-text">
              ChronoSync
            </h1>
            <p className="auth-subtitle text-sm text-muted">
              Multi-Tenant Timesheet Portal
            </p>
          </div>

          <div className="mb-8 text-center">
            <h2 className="auth-title text-2xl font-normal leading-8 text-text">
              Sign In to Timesheet App
            </h2>
            <p className="auth-subtitle mt-1 text-sm leading-5 text-muted">
              Enter your credentials to manage your time
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            {errorMsg && <div className="auth-error">{errorMsg}</div>}

            <div className={`auth-field ${email ? "has-value" : ""}`}>
              <span className="material-symbols-outlined auth-field-icon" aria-hidden="true">
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
              <label htmlFor="email">Email Address</label>
            </div>

            <div className={`auth-field ${password ? "has-value" : ""}`}>
              <span className="material-symbols-outlined auth-field-icon" aria-hidden="true">
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
              <label htmlFor="password">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="auth-field-action"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
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
                <span>{loading ? "Signing in..." : "Sign In"}</span>
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  arrow_forward
                </span>
              </button>

              <div className="flex justify-center">
                <button
                  type="button"
                  className="auth-link-button px-4 py-2 text-sm font-medium text-primary-strong transition hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </div>
          </form>

          <div className="mt-12 text-center">
            <p className="text-sm leading-5 text-muted-strong">
              Don&apos;t have an account?{" "}
              <a className="font-semibold text-primary-strong hover:underline" href="#">
                Contact Admin
              </a>
            </p>
          </div>
        </section>

        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted opacity-60">
          <span>v1.0.0</span>
        </div>
      </main>
    </div>
  );
};
