import React from "react";
import ReactDOM from "react-dom/client";
import "./shared/config/i18n";
import App from "./app";
import "./app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Web Vitals reporting (dev only, tree-shaken in production)
if (import.meta.env.DEV) {
  import("web-vitals").then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
    const report = (metric: { name: string; value: number; rating: string }) => {
      console.debug(`[web-vital] ${metric.name}: ${metric.value.toFixed(1)} (${metric.rating})`);
    };
    onCLS(report);
    onFCP(report);
    onINP(report);
    onLCP(report);
    onTTFB(report);
  });
}
