import { useState } from "react";

import "./IntroScreen.css";

type Screen = "main" | "difficulty";

interface IntroScreenProps {
  onStartGame: () => void;
}

export function IntroScreen({ onStartGame }: IntroScreenProps) {
  const [screen, setScreen] = useState<Screen>("main");

  const handleDifficultyPick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartGame();
  };

  return (
    <div className="intro-screen" onPointerDown={(e) => e.stopPropagation()}>
      <div className="intro-content">
        <h1 className="intro-title">Quick-Duel</h1>

        {screen === "main" && (
          <div className="intro-buttons">
            <button
              className="intro-btn intro-btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                setScreen("difficulty");
              }}
            >
              Play - Offline
            </button>
            <button className="intro-btn intro-btn-secondary" disabled>
              Play - Online
            </button>
          </div>
        )}

        {screen === "difficulty" && (
          <div className="intro-buttons">
            <button
              className="intro-btn intro-btn-difficulty intro-btn-beginner"
              onClick={handleDifficultyPick}
            >
              Beginner
            </button>
            <button
              className="intro-btn intro-btn-difficulty intro-btn-intermediate"
              onClick={handleDifficultyPick}
            >
              Intermediate
            </button>
            <button
              className="intro-btn intro-btn-difficulty intro-btn-advanced"
              onClick={handleDifficultyPick}
            >
              Advanced
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
