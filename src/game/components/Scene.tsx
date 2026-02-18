import { useApplication, useTick } from "@pixi/react";
import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { useEffect, useRef } from "react";

import { CHAR_SCALE, FRAME_SIZE } from "../constants";
import {
  useBackgroundTexture,
  useBricksTexture,
  useCharacterAnims,
  useHealthBarTexture,
} from "../hooks/useAssets";
import { useGameLoop } from "../hooks/useGameLoop";

// Ring geometry
const OUTER_RADIUS = 80;
const RING_WIDTH = 14;
const GAP = OUTER_RADIUS * 0.1; // 10% spacing between layers

// Outer ring: OUTER_RADIUS → OUTER_RADIUS - RING_WIDTH
// Inner ring: (OUTER_RADIUS - RING_WIDTH - GAP) → (OUTER_RADIUS - RING_WIDTH - GAP - RING_WIDTH)
const INNER_RING_OUTER = OUTER_RADIUS - RING_WIDTH - GAP;
const INNER_RING_INNER = INNER_RING_OUTER - RING_WIDTH;

// Dial: thin line from center to the outer ring envelope
const DIAL_LENGTH = OUTER_RADIUS-RING_WIDTH;
const DIAL_LINE_WIDTH = 4;
const DIAL_SPEED = 1.5; // radians per second (full rotation ≈ 4.2 s)

// Health bar sizing
const HEALTH_BAR_WIDTH = OUTER_RADIUS * 2.2;
const HEALTH_BAR_HEIGHT = 16;

export function Scene() {
  const { app } = useApplication();

  // Sprite refs
  const containerRef = useRef<Container>(null);
  const bgRef = useRef<Sprite>(null);
  const samuraiRef = useRef<Sprite>(null);
  const shinobiRef = useRef<Sprite>(null);

  // Bricks ring refs (outer ring)
  const outerRingSpriteRef = useRef<Sprite>(null);
  const outerRingMaskRef = useRef<Graphics>(null);

  // Bricks ring refs (inner ring)
  const innerRingSpriteRef = useRef<Sprite>(null);
  const innerRingMaskRef = useRef<Graphics>(null);

  // Dial (clock-hand) ref
  const dialRef = useRef<Graphics>(null);
  const dialAngle = useRef(-Math.PI / 2); // start at the top

  // Load assets
  const bgTexture = useBackgroundTexture();
  const bricksTexture = useBricksTexture();
  const healthBarTexture = useHealthBarTexture();
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

  // Apply ring masks once refs are ready
  useEffect(() => {
    if (outerRingSpriteRef.current && outerRingMaskRef.current) {
      outerRingSpriteRef.current.mask = outerRingMaskRef.current;
    }
    if (innerRingSpriteRef.current && innerRingMaskRef.current) {
      innerRingSpriteRef.current.mask = innerRingMaskRef.current;
    }
  }, [bricksTexture]);

  // Animate the dial rotation
  useTick((ticker) => {
    const dial = dialRef.current;
    if (!dial) return;

    const dt = ticker.deltaTime / 60;
    dialAngle.current += DIAL_SPEED * dt;

    dial.clear();
    dial.moveTo(0, 0);
    dial.lineTo(
      Math.cos(dialAngle.current) * DIAL_LENGTH,
      Math.sin(dialAngle.current) * DIAL_LENGTH,
    );
    dial.stroke({ color: 0xcc3311, width: DIAL_LINE_WIDTH, alpha: 0.9 });
  });

  // Derive initial textures
  const groundY = app.screen.height - FRAME_SIZE * CHAR_SCALE - 20;
  const samuraiTex = samuraiAnims ? samuraiAnims.Run[0] : Texture.EMPTY;
  const shinobiTex = shinobiAnims ? shinobiAnims.Run[0] : Texture.EMPTY;

  // Meeting point: center of screen, above ground
  const meetX = app.screen.width / 2;
  const meetY = groundY - OUTER_RADIUS - 10;

  return (
    <pixiContainer ref={containerRef}>
      <pixiSprite ref={bgRef} texture={bgTexture} x={0} y={0} />

      {/* Health bar above the ring */}
      {healthBarTexture !== Texture.EMPTY && (
        <pixiSprite
          texture={healthBarTexture}
          anchor={0.5}
          x={meetX}
          y={meetY - OUTER_RADIUS - HEALTH_BAR_HEIGHT}
          width={HEALTH_BAR_WIDTH}
          height={HEALTH_BAR_HEIGHT}
        />
      )}

      {/* Two concentric hollow brick rings above the meeting point */}
      {bricksTexture !== Texture.EMPTY && (
        <pixiContainer x={meetX} y={meetY}>
          {/* Outer ring mask (annulus) */}
          <pixiGraphics
            ref={outerRingMaskRef}
            draw={(g: Graphics) => {
              g.clear();
              g.circle(0, 0, OUTER_RADIUS);
              g.fill({ color: 0xffffff });
              g.circle(0, 0, OUTER_RADIUS - RING_WIDTH);
              g.cut();
            }}
          />
          {/* Outer ring sprite */}
          <pixiSprite
            ref={outerRingSpriteRef}
            texture={bricksTexture}
            anchor={0.5}
            width={OUTER_RADIUS * 2}
            height={OUTER_RADIUS * 2}
          />

          {/* Warm red thin dial line — animated via useTick */}
          <pixiGraphics
            ref={dialRef}
            draw={() => {
              /* initial draw is a no-op; redrawn each tick */
            }}
          />

          {/* Inner ring mask (annulus) */}
          <pixiGraphics
            ref={innerRingMaskRef}
            draw={(g: Graphics) => {
              g.clear();
              g.circle(0, 0, INNER_RING_OUTER);
              g.fill({ color: 0xffffff });
              g.circle(0, 0, INNER_RING_INNER);
              g.cut();
            }}
          />
          {/* Inner ring sprite */}
          <pixiSprite
            ref={innerRingSpriteRef}
            texture={bricksTexture}
            anchor={0.5}
            width={INNER_RING_OUTER * 2}
            height={INNER_RING_OUTER * 2}
          />
        </pixiContainer>
      )}

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
