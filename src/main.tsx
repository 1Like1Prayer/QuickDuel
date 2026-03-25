import { createRoot } from "react-dom/client";

import App from "./App.tsx";

/* ── PWA install prompt ── */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Stored deferred prompt so we can trigger native install from a user tap. */
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function getDeferredPrompt() {
  return deferredPrompt;
}

export async function triggerInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === "accepted";
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
});

/* ── React root ── */

createRoot(document.getElementById("pixi-container")!).render(<App />);
