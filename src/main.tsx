import { createRoot } from "react-dom/client";

import App from "./App.tsx";

/* ── PWA install prompt ── */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener("beforeinstallprompt", (e) => {
  deferredPrompt = e as BeforeInstallPromptEvent;
});

export async function triggerInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  console.log('deferredPrompt', deferredPrompt);
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === "accepted";
}

/* ── React root ── */

createRoot(document.getElementById("pixi-container")!).render(<App />);
