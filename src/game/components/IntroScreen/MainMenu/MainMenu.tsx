import { useSyncExternalStore } from "react";
import { copies } from "../../../../copies";
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
    <nav className="intro-buttons" role="navigation" aria-label={copies.mainMenu.navAriaLabel}>
      <button
        className="intro-btn intro-btn-primary"
        onClick={onPlay}
      >
        {copies.mainMenu.playOffline}
      </button>
      <button
        className="intro-btn intro-btn-secondary"
        disabled={!isOnline}
        onClick={isOnline ? onPlayOnline : undefined}
        aria-label={isOnline ? copies.mainMenu.playOnlineAriaLabel : copies.mainMenu.playOnlineOfflineAriaLabel}
      >
        {copies.mainMenu.playOnline}
        {!isOnline && <span className="coming-soon-badge">{copies.mainMenu.offlineBadge}</span>}
      </button>
      <button
        className="intro-btn intro-btn-settings"
        onClick={onSettings}
      >
        {copies.mainMenu.settings}
      </button>
      <button
        className="intro-btn intro-btn-settings"
        onClick={onTutorial}
      >
        {copies.mainMenu.tutorial}
      </button>
    </nav>
  );
}
