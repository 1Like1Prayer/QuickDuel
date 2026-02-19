import { useState } from "react";

import { useGameStore } from "../../state";
import type { Difficulty } from "../../state";
import "./IntroScreen.css";

type Screen = "main" | "difficulty";

export function IntroScreen() {
  const startGame = useGameStore((s) => s.startGame);
  const [screen, setScreen] = useState<Screen>("main");

  const handleDifficultyPick = (difficulty: Difficulty) => (e: React.MouseEvent) => {
    e.stopPropagation();
    startGame(difficulty);
  };

  return (
    <div className="intro-screen" onPointerDown={(e) => e.stopPropagation()}>
      <h1 className="intro-title">Quick-Duel</h1>

      <div className="intro-content">
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
              onClick={handleDifficultyPick("beginner")}
            >
              Beginner
            </button>
            <button
              className="intro-btn intro-btn-difficulty intro-btn-intermediate"
              onClick={handleDifficultyPick("intermediate")}
            >
              Intermediate
            </button>
            <button
              className="intro-btn intro-btn-difficulty intro-btn-advanced"
              onClick={handleDifficultyPick("advanced")}
            >
              Advanced
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
