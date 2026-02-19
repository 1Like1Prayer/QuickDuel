import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";
import { useCallback, useRef, useState } from "react";

import { IntroScreen } from "./game/components/IntroScreen";
import { Scene } from "./game/components/Scene";

extend({ Container, Graphics, Sprite, Text });

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const startGameRef = useRef(false);

  const handleStartGame = useCallback(() => {
    startGameRef.current = true;
    setShowIntro(false);
  }, []);

  return (
    <>
      <Application background={"#000000"} resizeTo={window}>
        <Scene startGame={startGameRef} />
      </Application>
      {showIntro && <IntroScreen onStartGame={handleStartGame} />}
    </>
  );
}
