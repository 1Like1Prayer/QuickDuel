import "./MainMenu.css";

interface MainMenuProps {
  onPlay: () => void;
  onSettings: () => void;
  onTutorial: () => void;
}

export function MainMenu({ onPlay, onSettings, onTutorial }: MainMenuProps) {
  return (
    <div className="intro-buttons">
      <button
        className="intro-btn intro-btn-primary"
        onClick={onPlay}
      >
        Play - Offline
      </button>
      <button className="intro-btn intro-btn-secondary" disabled>
        Play - Online
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
    </div>
  );
}
