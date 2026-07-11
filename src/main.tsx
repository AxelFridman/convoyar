import React from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import App from "./App";

const el = document.getElementById("root")!;
createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker: solo en build normal (no en single-file ni dev)
if (import.meta.env.PROD && !import.meta.env.VITE_SINGLE && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline opcional */
    });
  });
}
