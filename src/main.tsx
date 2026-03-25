import { createRoot } from "react-dom/client";

import App from "./App.tsx";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

// Auto-prompt PWA install when opened in a mobile browser
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  (e as BeforeInstallPromptEvent).prompt();
});

createRoot(document.getElementById("pixi-container")!).render(<App />);
