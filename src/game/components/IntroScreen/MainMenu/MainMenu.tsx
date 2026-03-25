import { useSyncExternalStore } from "react";
import "./MainMenu.css";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

interface MainMenuProps {
  onPlay: () => void;
  onPlayOnline?: () => void;
  onSettings: () => void;
  onTutorial: () => void;
}

export function MainMenu({ onPlay, onPlayOnline, onSettings, onTutorial }: MainMenuProps) {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot);

  return (
    <nav className="intro-buttons" role="navigation" aria-label="Main menu">
      <button
        className="intro-btn intro-btn-primary"
        onClick={onPlay}
      >
        Play - Offline
      </button>
      <button
        className="intro-btn intro-btn-secondary"
        disabled={!isOnline}
        onClick={isOnline ? onPlayOnline : undefined}
        aria-label={isOnline ? "Play Online" : "Play Online (offline)"}
      >
        Play - Online
        {!isOnline && <span className="coming-soon-badge">Offline</span>}
      </button>
      <button
        className="intro-btn intro-btn-settings"
        onClick={onSettings}
      >
        Settings
      </button>
      <button
        className="intro-btn intro-btn-settings"
        onClick={onTutorial}
      >
        Tutorial
      </button>
    </nav>
  );
}
