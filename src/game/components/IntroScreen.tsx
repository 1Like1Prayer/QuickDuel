import { useState } from "react";

import { useGameStore } from "../../state";
import type { Difficulty } from "../../state";
import "./IntroScreen.css";

type Screen = "main" | "difficulty" | "settings" | "tutorial-ask" | "tutorial-show" | "tutorial-show-menu";

export function IntroScreen() {
  const startGame = useGameStore((s) => s.startGame);
  const bgmVolume = useGameStore((s) => s.bgmVolume);
  const sfxEnabled = useGameStore((s) => s.sfxEnabled);
  const setBgmVolume = useGameStore((s) => s.setBgmVolume);
  const setSfxEnabled = useGameStore((s) => s.setSfxEnabled);
  const tutorialSeen = useGameStore((s) => s.tutorialSeen);
  const markTutorialSeen = useGameStore((s) => s.markTutorialSeen);
  const [screen, setScreen] = useState<Screen>("main");
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty>("beginner");

  const handleDifficultyPick = (difficulty: Difficulty) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tutorialSeen) {
      setPendingDifficulty(difficulty);
      setScreen("tutorial-ask");
    } else {
      startGame(difficulty);
    }
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
            <button
              className="intro-btn intro-btn-settings"
              onClick={(e) => {
                e.stopPropagation();
                setScreen("settings");
              }}
            >
              Settings
            </button>
            <button
              className="intro-btn intro-btn-settings"
              onClick={(e) => {
                e.stopPropagation();
                setScreen("tutorial-show-menu");
              }}
            >
              Tutorial
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
            <button
              className="intro-btn intro-btn-back"
              onClick={(e) => {
                e.stopPropagation();
                setScreen("main");
              }}
            >
              Back
            </button>
          </div>
        )}

        {screen === "settings" && (
          <div className="settings-panel">
            <div className="settings-row">
              <label className="settings-label">Music Volume</label>
              <div className="settings-slider-row">
                <input
                  type="range"
                  className="settings-slider"
                  min={0}
                  max={100}
                  value={Math.round(bgmVolume * 100)}
                  onChange={(e) => setBgmVolume(Number(e.target.value) / 100)}
                />
                <span className="settings-value">{Math.round(bgmVolume * 100)}%</span>
              </div>
            </div>

            <div className="settings-row">
              <label className="settings-label">Sound Effects</label>
              <button
                className={`settings-toggle ${sfxEnabled ? "settings-toggle-on" : "settings-toggle-off"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSfxEnabled(!sfxEnabled);
                }}
              >
                {sfxEnabled ? "ON" : "OFF"}
              </button>
            </div>

            <button
              className="intro-btn intro-btn-back"
              onClick={(e) => {
                e.stopPropagation();
                setScreen("main");
              }}
            >
              Back
            </button>
          </div>
        )}

        {screen === "tutorial-ask" && (
          <div className="intro-buttons">
            <p className="tutorial-prompt">Would you like to see the tutorial?</p>
            <button
              className="intro-btn intro-btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                setScreen("tutorial-show");
              }}
            >
              Show Tutorial
            </button>
            <button
              className="intro-btn intro-btn-settings"
              onClick={(e) => {
                e.stopPropagation();
                markTutorialSeen();
                startGame(pendingDifficulty);
              }}
            >
              Skip
            </button>
          </div>
        )}

        {screen === "tutorial-show" && (
          <div className="tutorial-panel">
            <img
              src="/Tutorial.jpg"
              alt="Tutorial"
              className="tutorial-image"
            />
            <button
              className="intro-btn intro-btn-primary tutorial-start-btn"
              onClick={(e) => {
                e.stopPropagation();
                markTutorialSeen();
                startGame(pendingDifficulty);
              }}
            >
              Start Game
            </button>
          </div>
        )}

        {screen === "tutorial-show-menu" && (
          <div className="tutorial-panel">
            <img
              src="/Tutorial.jpg"
              alt="Tutorial"
              className="tutorial-image"
            />
            <button
              className="intro-btn intro-btn-back"
              onClick={(e) => {
                e.stopPropagation();
                setScreen("main");
              }}
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
