import { useState } from "react";

import { useGameStore } from "../../../state";
import type { Difficulty } from "../../../state";
import { copies } from "../../../copies";
import { MainMenu } from "./MainMenu/MainMenu";
import { DifficultySelect } from "./DifficultySelect/DifficultySelect";
import { Settings } from "./Settings/Settings";
import { Tutorial } from "./Tutorial/Tutorial";
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

  const handleDifficultyPick = (difficulty: Difficulty) => {
    if (!tutorialSeen) {
      setPendingDifficulty(difficulty);
      setScreen("tutorial-ask");
    } else {
      startGame(difficulty);
    }
  };

  return (
    <div className="intro-screen" onPointerDown={(e) => e.stopPropagation()}>
      <h1 className="intro-title">{copies.common.gameTitle}</h1>

      <div className="intro-content">
        {screen === "main" && (
          <MainMenu
            onPlay={() => setScreen("difficulty")}
            onSettings={() => setScreen("settings")}
            onTutorial={() => setScreen("tutorial-show-menu")}
          />
        )}

        {screen === "difficulty" && (
          <DifficultySelect
            onPick={handleDifficultyPick}
            onBack={() => setScreen("main")}
          />
        )}

        {screen === "settings" && (
          <Settings
            bgmVolume={bgmVolume}
            sfxEnabled={sfxEnabled}
            onBgmVolumeChange={setBgmVolume}
            onSfxToggle={() => setSfxEnabled(!sfxEnabled)}
            onBack={() => setScreen("main")}
          />
        )}

        {(screen === "tutorial-ask" || screen === "tutorial-show" || screen === "tutorial-show-menu") && (
          <Tutorial
            screen={screen}
            onShowTutorial={() => setScreen("tutorial-show")}
            onSkip={() => {
              markTutorialSeen();
              startGame(pendingDifficulty);
            }}
            onStartGame={() => {
              markTutorialSeen();
              startGame(pendingDifficulty);
            }}
            onBack={() => setScreen("main")}
          />
        )}
      </div>
    </div>
  );
}
