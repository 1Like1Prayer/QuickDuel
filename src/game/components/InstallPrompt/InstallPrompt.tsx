import { useEffect, useRef, useState } from "react";
import { getDeferredPrompt, triggerInstall } from "../../../main";
import "./InstallPrompt.css";

/* ── Helpers ── */

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/* ── Component ── */

interface InstallPromptProps {
  onDismiss: () => void;
}

export function InstallPrompt({ onDismiss }: InstallPromptProps) {
  const shouldShow = isMobile() && !isStandalone();
  const [installing, setInstalling] = useState(false);
  const [closing, setClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  /* Focus-trap: focus the modal on mount */
  useEffect(() => {
    if (shouldShow) modalRef.current?.focus();
  }, [shouldShow]);

  /* Not on mobile or already installed — skip entirely */
  if (!shouldShow) {
    onDismiss();
    return null;
  }

  const canPrompt = !!getDeferredPrompt();

  const handleInstall = async () => {
    setInstalling(true);
    const accepted = await triggerInstall();
    setInstalling(false);
    if (accepted) dismiss();
  };

  const dismiss = () => {
    setClosing(true);
    setTimeout(onDismiss, 280);
  };

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
          src="/pwa-192x192.svg"
          alt="QuickDuel icon"
          className="install-icon-img"
          width={72}
          height={72}
        />

        <h2 id="install-title" className="install-title">
          Install QuickDuel
        </h2>

        <p className="install-desc">
          Play fullscreen, load instantly, and work offline — install QuickDuel
          on your home screen!
        </p>

        {canPrompt ? (
          <button
            className="intro-btn intro-btn-primary install-action-btn"
            onClick={handleInstall}
            disabled={installing}
          >
            {installing ? "Installing…" : "Install App"}
          </button>
        ) : isIOS() ? (
          <div className="install-instructions">
            <p>
              Tap{" "}
              <span className="install-safari-icon" aria-hidden="true">
                {/* Safari share icon approximation */}
                ⬆
              </span>{" "}
              <strong>Share</strong> in Safari, then{" "}
              <strong>"Add&nbsp;to&nbsp;Home&nbsp;Screen"</strong>.
            </p>
          </div>
        ) : (
          <div className="install-instructions">
            <p>
              Tap{" "}
              <span className="install-menu-icon" aria-hidden="true">⋮</span>{" "}
              in your browser, then{" "}
              <strong>"Install&nbsp;app"</strong> or{" "}
              <strong>"Add&nbsp;to&nbsp;Home&nbsp;Screen"</strong>.
            </p>
          </div>
        )}

        <button
          className="intro-btn intro-btn-settings install-dismiss-btn"
          onClick={dismiss}
        >
          Continue in Browser
        </button>
      </div>
    </div>
  );
}
