import { lazy, Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import { PageLoading } from "./components/shared/PageLoading";
import { PwaSupport } from "./components/shared/PwaSupport";

// The marketing website is an independent project in landing/.
const ApplicationRoutes = lazy(() => import("./ApplicationRoutes"));
const DemoApplication = lazy(() => import("./demo/DemoApplication"));

export default function App() {
  if (window.location.pathname === "/demo") {
    return <Suspense fallback={<PageLoading />}><DemoApplication /></Suspense>;
  }
  return (
    <BrowserRouter>
      <PwaSupport />
      <Suspense fallback={<PageLoading />}>
        <ApplicationRoutes />
      </Suspense>
    </BrowserRouter>
  );
}
