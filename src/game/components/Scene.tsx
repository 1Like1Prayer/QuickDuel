import { useApplication, useTick } from "@pixi/react";
import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { useEffect, useRef } from "react";

import {
  BLOCK_ALPHA,
  BLOCK_ARC_SEGMENTS,
  BLOCK_COLOR,
  CHAR_SCALE,
  DIAL_BASE_SPEED,
  DIAL_LENGTH,
  DIAL_LINE_WIDTH,
  FIGHT_TEXT_STYLE,
  FRAME_SIZE,
  GAP_INNER,
  GAP_OUTER,
  HEALTH_BAR_HEIGHT,
  HEALTH_BAR_WIDTH,
  INNER_RING_INNER,
  INNER_RING_OUTER,
  OUTER_RADIUS,
  RING_WIDTH,
} from "../constants";
import {
  useBackgroundTexture,
  useBricksTexture,
  useCharacterAnims,
  useHealthBarTexture,
} from "../hooks/useAssets";
import { useDialGame } from "../hooks/useDialGame";
import { useGameLoop } from "../hooks/useGameLoop";

export function Scene() {
  const { app } = useApplication();

  // Sprite refs
  const containerRef = useRef<Container>(null);
  const bgRef = useRef<Sprite>(null);
  const samuraiRef = useRef<Sprite>(null);
  const shinobiRef = useRef<Sprite>(null);

  // "FIGHT!" text ref & visibility flag (mutated by useGameLoop)
  const fightTextRef = useRef<Text>(null);
  const showFightText = useRef(false);

  // Bricks ring refs (outer ring)
  const outerRingSpriteRef = useRef<Sprite>(null);
  const outerRingMaskRef = useRef<Graphics>(null);

  // Bricks ring refs (inner ring)
  const innerRingSpriteRef = useRef<Sprite>(null);
  const innerRingMaskRef = useRef<Graphics>(null);

  // Dial (clock-hand) and hit-zone blocks ref
  const dialRef = useRef<Graphics>(null);
  const blocksGfxRef = useRef<Graphics>(null);

  // Load assets
  const bgTexture = useBackgroundTexture();
  const bricksTexture = useBricksTexture();
  const healthBarTexture = useHealthBarTexture();
  const { samuraiAnims, shinobiAnims } = useCharacterAnims();

  // Dial game logic
  const dialGame = useDialGame({ baseSpeed: DIAL_BASE_SPEED });

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
    dialGame,
    showFightText,
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

  // Animate the dial, redraw hit-zone blocks, and toggle FIGHT text each tick
  useTick((ticker) => {
    const dial = dialRef.current;
    const blocksGfx = blocksGfxRef.current;
    if (!dial) return;

    // Toggle "FIGHT!" text visibility
    if (fightTextRef.current) {
      fightTextRef.current.visible = showFightText.current;
    }

    const dt = ticker.deltaTime / 60;

    // Advance dial via game logic
    const angle = dialGame.tick(dt);

    // ── Draw dial line ──
    dial.clear();
    dial.moveTo(0, 0);
    dial.lineTo(Math.cos(angle) * DIAL_LENGTH, Math.sin(angle) * DIAL_LENGTH);
    dial.stroke({ color: 0xcc3311, width: DIAL_LINE_WIDTH, alpha: 0.9 });

    // ── Draw hit-zone blocks in the gap between rings ──
    if (blocksGfx) {
      blocksGfx.clear();
      const currentBlocks = dialGame.blocks.current;
      const steps = BLOCK_ARC_SEGMENTS;

      for (const block of currentBlocks) {
        const arcSpan = block.endAngle - block.startAngle;
        const angleStep = arcSpan / steps;

        // Build annular wedge path
        blocksGfx.moveTo(
          Math.cos(block.startAngle) * GAP_OUTER,
          Math.sin(block.startAngle) * GAP_OUTER,
        );
        for (let i = 1; i <= steps; i++) {
          const a = block.startAngle + angleStep * i;
          blocksGfx.lineTo(Math.cos(a) * GAP_OUTER, Math.sin(a) * GAP_OUTER);
        }
        for (let i = steps; i >= 0; i--) {
          const a = block.startAngle + angleStep * i;
          blocksGfx.lineTo(Math.cos(a) * GAP_INNER, Math.sin(a) * GAP_INNER);
        }
        blocksGfx.closePath();
        blocksGfx.fill({ color: BLOCK_COLOR, alpha: BLOCK_ALPHA });
      }
    }
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

          {/* Hit-zone blocks between the two rings — redrawn each tick */}
          <pixiGraphics
            ref={blocksGfxRef}
            draw={() => {
              /* initial no-op; redrawn each tick */
            }}
          />

          {/* Warm red thin dial line — animated via useTick */}
          <pixiGraphics
            ref={dialRef}
            draw={() => {
              /* initial no-op; redrawn each tick */
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

      {/* "FIGHT!" text — shown during fight_text phase */}
      <pixiText
        ref={fightTextRef}
        text="FIGHT!"
        anchor={0.5}
        x={app.screen.width / 2}
        y={app.screen.height / 2 - 40}
        style={FIGHT_TEXT_STYLE}
        visible={false}
      />
    </pixiContainer>
  );
}
