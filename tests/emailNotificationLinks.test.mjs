import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { safeAuthContinuation } from "../src/utils/authActions.ts";
import { getHomeRouteForRole } from "../src/utils/navigation.ts";

// Exercise the actual route components without contacting Auth or a browser.
// Effects run against a supplied auth state; JSX is represented as plain nodes.
async function renderRoute(file, name, { authenticated = false, loading = false, pathname = "/timesheet", search = "", hash = "" } = {}) {
  const navigations = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: initial => [typeof initial === "function" ? initial() : initial, () => {}],
    useEffect: effect => effect(),
  };
  const dependencies = {
    react: { __esModule: true, default: react, ...react },
    "react-router-dom": {
      Navigate: "Navigate", Outlet: "Outlet", Link: "Link",
      useLocation: () => ({ pathname, search, hash }),
      useSearchParams: () => [new URLSearchParams(search)],
      useNavigate: () => (destination, options) => navigations.push({ destination, options }),
    },
    "react-i18next": { useTranslation: () => ({ t: key => key }) },
  };
  const source = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const exports = {};
  const require = dependency => {
    if (dependency.endsWith("/authActions")) return { safeAuthContinuation };
    if (dependency.endsWith("/navigation")) return { getHomeRouteForRole };
    if (dependency.endsWith("/useAuth")) return { useAuth: () => ({
      user: authenticated ? { id: "employee" } : null,
      profile: authenticated ? { id: "employee", role: "regular" } : null,
      loading, isSuperAdmin: false, isCompanyAdmin: false,
    }) };
    if (dependency.endsWith("/authService")) return {
      requestPasswordReset: () => { throw new Error("No Auth requests expected"); },
      signInUser: () => { throw new Error("No Auth requests expected"); },
    };
    return dependencies[dependency] ?? new Proxy({}, { get: (_, key) => String(key) });
  };
  new Function("require", "exports", outputText)(require, exports);
  return { element: exports[name]({}), navigations };
}

test("employee email destinations survive the signed-out guard and sign-in", async () => {
  for (const [pathname, search] of [["/timesheet", "?view=attention"], ["/leaves", ""]]) {
    const { element } = await renderRoute("components/shared/ProtectedRoute.tsx", "ProtectedRoute", { pathname, search });
    assert.equal(element.type, "Navigate");
    const login = new URL(element.props.to, "https://app.example.test");
    assert.equal(login.pathname, "/login");
    assert.equal(login.searchParams.get("returnTo"), pathname + search);
    const { navigations } = await renderRoute("pages/LoginPage.tsx", "LoginPage", { authenticated: true, search: login.search });
    assert.deepEqual(navigations, [{ destination: pathname + search, options: { replace: true } }]);
  }
});

test("login continuations cannot redirect externally or create an auth loop", async () => {
  for (const destination of ["https://evil.example", "//evil.example", "/login", "/auth/invite"]) {
    const { navigations } = await renderRoute("pages/LoginPage.tsx", "LoginPage", {
      authenticated: true, search: `?returnTo=${encodeURIComponent(destination)}`,
    });
    assert.equal(navigations[0].destination, getHomeRouteForRole("regular"));
  }
});

test("email continuation waits for authentication and profile loading", async () => {
  for (const state of [{ authenticated: false }, { authenticated: true, loading: true }]) {
    const { navigations } = await renderRoute("pages/LoginPage.tsx", "LoginPage", {
      ...state, search: "?returnTo=%2Ftimesheet%3Fview%3Dattention",
    });
    assert.deepEqual(navigations, []);
  }
});
