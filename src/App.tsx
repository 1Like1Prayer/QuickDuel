import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";

import { useGameStore } from "./state";
import { EndScreen } from "./game/components/EndScreen";
import { IntroScreen } from "./game/components/IntroScreen";
import { Scene } from "./game/components/Scene";

extend({ Container, Graphics, Sprite, Text });

const appContainer = document.getElementById("app")!;

export default function App() {
  const phase = useGameStore((s) => s.phase);

  return (
    <>
      <Application background={"#000000"} resizeTo={appContainer}>
        <Scene />
      </Application>
      {phase === "intro" && <IntroScreen />}
      {phase === "ended" && <EndScreen />}
    </>
  );
}
