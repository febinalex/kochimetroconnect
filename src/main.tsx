import React from "react";
import ReactDOM from "react-dom/client";
import "./polyfills";
import "./styles/globals.css";
import App from "./App";

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const GOOGLE_ANALYTICS_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID as string | undefined;

if (typeof window !== "undefined" && GOOGLE_ANALYTICS_ID) {
  window.dataLayer = window.dataLayer || [];
  
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ANALYTICS_ID)}`;
  document.head.appendChild(script);
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ANALYTICS_ID);
}

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
