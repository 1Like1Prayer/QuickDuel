import { copies } from "../../../../copies";
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
        <p className="tutorial-prompt">{copies.tutorial.prompt}</p>
        <button
          className="intro-btn intro-btn-primary"
          onClick={onShowTutorial}
        >
          {copies.tutorial.showTutorial}
        </button>
        <button
          className="intro-btn intro-btn-settings"
          onClick={onSkip}
        >
          {copies.tutorial.skip}
        </button>
      </div>
    );
  }

  if (screen === "tutorial-show") {
    return (
      <div className="tutorial-panel">
        <img
          src="/Tutorial.jpg"
          alt={copies.tutorial.imageAlt}
          className="tutorial-image"
        />
        <button
          className="intro-btn intro-btn-primary tutorial-start-btn"
          onClick={onStartGame}
        >
          {copies.tutorial.startGame}
        </button>
      </div>
    );
  }

  /* tutorial-show-menu */
  return (
    <div className="tutorial-panel">
      <img
        src="/Tutorial.jpg"
        alt={copies.tutorial.imageAlt}
        className="tutorial-image"
      />
      <button
        className="intro-btn intro-btn-back"
        onClick={onBack}
      >
        {copies.common.back}
      </button>
    </div>
  );
}
