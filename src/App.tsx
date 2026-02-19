import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";

import { useGameStore } from "./state";
import { IntroScreen } from "./game/components/IntroScreen";
import { Scene } from "./game/components/Scene";

extend({ Container, Graphics, Sprite, Text });

export default function App() {
  const phase = useGameStore((s) => s.phase);

  return (
    <>
      <Application background={"#000000"} resizeTo={window}>
        <Scene />
      </Application>
      {phase === "intro" && <IntroScreen />}
    </>
  );
}
