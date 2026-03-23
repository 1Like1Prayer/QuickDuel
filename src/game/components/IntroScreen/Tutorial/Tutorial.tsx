import "./Tutorial.css";

type TutorialScreen = "tutorial-ask" | "tutorial-show" | "tutorial-show-menu";

interface TutorialProps {
  screen: TutorialScreen;
  onShowTutorial: () => void;
  onSkip: () => void;
  onStartGame: () => void;
  onBack: () => void;
}

export function Tutorial({
  screen,
  onShowTutorial,
  onSkip,
  onStartGame,
  onBack,
}: TutorialProps) {
  if (screen === "tutorial-ask") {
    return (
      <div className="intro-buttons">
        <p className="tutorial-prompt">Would you like to see the tutorial?</p>
        <button
          className="intro-btn intro-btn-primary"
          onClick={onShowTutorial}
        >
          Show Tutorial
        </button>
        <button
          className="intro-btn intro-btn-settings"
          onClick={onSkip}
        >
          Skip
        </button>
      </div>
    );
  }

  if (screen === "tutorial-show") {
    return (
      <div className="tutorial-panel">
        <img
          src="/Tutorial.jpg"
          alt="Tutorial"
          className="tutorial-image"
        />
        <button
          className="intro-btn intro-btn-primary tutorial-start-btn"
          onClick={onStartGame}
        >
          Start Game
        </button>
      </div>
    );
  }

  /* tutorial-show-menu */
  return (
    <div className="tutorial-panel">
      <img
        src="/Tutorial.jpg"
        alt="Tutorial"
        className="tutorial-image"
      />
      <button
        className="intro-btn intro-btn-back"
        onClick={onBack}
      >
        Back
      </button>
    </div>
  );
}
