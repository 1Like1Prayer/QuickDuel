import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";

import { EndScreen } from "./game/components/EndScreen/EndScreen";
import { useGameStore } from "./state";

import { IntroScreen } from "./game/components/IntroScreen/IntroScreen";
import { Scene } from "./game/components/Scene";

extend({ Container, Graphics, Sprite, Text });

const appContainer = document.getElementById("app")!;

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const muted = useGameStore((s) => s.muted);
  const toggleMute = useGameStore((s) => s.toggleMute);

  return (
    <>
      <Application background={"#000000"} resizeTo={appContainer}>
        <Scene />
      </Application>
      {phase === "intro" && <IntroScreen />}

      {phase === "ended" && <EndScreen />}
      <button
        className={`mute-btn${muted ? " is-muted" : ""}`}
        onClick={() => toggleMute()}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        <img
          src={muted ? "/mute.png" : "/sound.png"}
          alt={muted ? "Unmute" : "Mute"}
        />
      </button>
    </>
  );
}
