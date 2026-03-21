import React from "react";
import ReactDOM from "react-dom/client";
import "./polyfills";
import "./styles/globals.css";
import App from "./App";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GOOGLE_ANALYTICS_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID as string | undefined;

if (typeof window !== "undefined" && GOOGLE_ANALYTICS_ID) {
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });

  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ANALYTICS_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ANALYTICS_ID)}`;
  document.head.appendChild(script);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
