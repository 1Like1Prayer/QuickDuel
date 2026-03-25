import { useEffect, useRef, useState } from "react";
import { triggerInstall } from "../../../main";
import { copies } from "../../../copies";
import "./InstallPrompt.css";

/* ── Helpers ── */

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/* ── Component ── */

interface InstallPromptProps {
  onDismiss: () => void;
}

export function InstallPrompt({ onDismiss }: InstallPromptProps) {
  const [shouldShow] = useState(() => !isStandalone());
  const [installing, setInstalling] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [closing, setClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  /* Auto-dismiss when already standalone */
  useEffect(() => {
    if (!shouldShow) onDismiss();
  }, [shouldShow, onDismiss]);

  /* Focus the modal on mount */
  useEffect(() => {
    if (shouldShow) modalRef.current?.focus();
  }, [shouldShow]);

  if (!shouldShow) return null;

  const handleInstall = async () => {
    setInstalling(true);
    const accepted = await triggerInstall();
    setInstalling(false);
    if (accepted) {
      dismiss();
    } else {
      // Native prompt unavailable — show manual instructions
      setShowFallback(true);
    }
  };

  const dismiss = () => {
    setClosing(true);
    setTimeout(onDismiss, 280);
  };

  const isIOS =
    /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <div className={`install-overlay${closing ? " install-overlay--closing" : ""}`}>
      <div
        ref={modalRef}
        className="install-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        tabIndex={-1}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* App icon */}
        <img
          src="/logos/pwa-192x192.png"
          alt={copies.installPrompt.iconAlt}
          className="install-icon-img"
          width={72}
          height={72}
        />

        <h2 id="install-title" className="install-title">
          {copies.installPrompt.title}
        </h2>

        <p className="install-desc">
          {copies.installPrompt.description}
        </p>

        {!showFallback ? (
          <button
            className="intro-btn intro-btn-primary install-action-btn"
            onClick={handleInstall}
            disabled={installing}
          >
            {installing ? copies.installPrompt.installingButton : copies.installPrompt.installButton}
          </button>
        ) : (
          <div className="install-instructions">
            {isIOS ? (
              <p>
                {copies.installPrompt.ios.tap}{" "}
                <span className="install-safari-icon" aria-hidden="true">⬆</span>{" "}
                <strong>{copies.installPrompt.ios.share}</strong> {copies.installPrompt.ios.inSafariThen}{" "}
                <strong>{copies.installPrompt.ios.addToHomeScreen}</strong>.
              </p>
            ) : (
              <p>
                {copies.installPrompt.android.tap}{" "}
                <span className="install-menu-icon" aria-hidden="true">⋮</span>{" "}
                {copies.installPrompt.android.inBrowserMenuThen}{" "}
                <strong>{copies.installPrompt.android.installApp}</strong> {copies.installPrompt.android.or}{" "}
                <strong>{copies.installPrompt.android.addToHomeScreen}</strong>.
              </p>
            )}
          </div>
        )}

        <button
          className="intro-btn intro-btn-settings install-dismiss-btn"
          onClick={dismiss}
        >
          {copies.installPrompt.dismissButton}
        </button>
      </div>
    </div>
  );
}
