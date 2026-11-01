import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter/opsz.css";
import "./base.css";
import "./i18n";
import { LandingPage } from "./pages/LandingPage";

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><LandingPage /></React.StrictMode>);
