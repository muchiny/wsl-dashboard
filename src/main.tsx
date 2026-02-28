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
