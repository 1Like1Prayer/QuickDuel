import "./MainMenu.css";

interface MainMenuProps {
  onPlay: () => void;
  onSettings: () => void;
  onTutorial: () => void;
}

export function MainMenu({ onPlay, onSettings, onTutorial }: MainMenuProps) {
  return (
    <nav className="intro-buttons" role="navigation" aria-label="Main menu">
      <button
        className="intro-btn intro-btn-primary"
        onClick={onPlay}
      >
        Play - Offline
      </button>
      <button className="intro-btn intro-btn-secondary" disabled aria-label="Play Online (coming soon)">
        Play - Online
        <span className="coming-soon-badge">Soon</span>
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
