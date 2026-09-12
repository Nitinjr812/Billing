// registerServiceWorker.js
// Import and call this once, as early as possible, in your app's entry
// file (main.jsx / index.js) — e.g.:
//
//   import { registerServiceWorker } from "./registerServiceWorker";
//   registerServiceWorker();
//
export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service worker registered:", reg.scope);
        })
        .catch((err) => {
          console.error("Service worker registration failed:", err);
        });
    });
  }
}