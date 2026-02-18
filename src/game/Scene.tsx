import { useApplication } from "@pixi/react";
import { Container, Sprite, Texture } from "pixi.js";
import { useRef } from "react";

import { CHAR_SCALE, FRAME_SIZE } from "./constants";
import { useBackgroundTexture, useCharacterAnims } from "./useAssets";
import { useGameLoop } from "./useGameLoop";

export function Scene() {
  const { app } = useApplication();

  // Sprite refs
  const containerRef = useRef<Container>(null);
  const bgRef = useRef<Sprite>(null);
  const samuraiRef = useRef<Sprite>(null);
  const shinobiRef = useRef<Sprite>(null);

  // Load assets
  const bgTexture = useBackgroundTexture();
  const { samuraiAnims, shinobiAnims } = useCharacterAnims();

  // Run game loop
  useGameLoop({
    app,
    refs: {
      container: containerRef,
      bg: bgRef,
      samurai: samuraiRef,
      shinobi: shinobiRef,
    },
    bgTexture,
    samuraiAnims,
    shinobiAnims,
  });

  // Derive initial textures
  const groundY = app.screen.height - FRAME_SIZE * CHAR_SCALE - 20;
  const samuraiTex = samuraiAnims ? samuraiAnims.Run[0] : Texture.EMPTY;
  const shinobiTex = shinobiAnims ? shinobiAnims.Run[0] : Texture.EMPTY;

  return (
    <pixiContainer ref={containerRef}>
      <pixiSprite ref={bgRef} texture={bgTexture} x={0} y={0} />
      <pixiSprite
        ref={samuraiRef}
        texture={samuraiTex}
        x={50}
        y={groundY}
        scale={CHAR_SCALE}
      />
      <pixiSprite
        ref={shinobiRef}
        texture={shinobiTex}
        x={app.screen.width - 50 - FRAME_SIZE * CHAR_SCALE}
        y={groundY}
        scale={CHAR_SCALE}
      />
    </pixiContainer>
  );
}
