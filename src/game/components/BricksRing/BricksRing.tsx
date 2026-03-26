import { useTick } from "@pixi/react";
import { Graphics, Sprite, Texture } from "pixi.js";
import { useEffect, useRef } from "react";

import type { UseDialGameReturn } from "../../hooks/types/useDialGame.types";
import type { LayoutDial, LayoutRing } from "../../hooks/types/useLayout.types";
import { drawBlocks, drawDial, drawHitGlow, drawMissLine, drawMissPulse } from "../../utils";

export interface BricksRingProps {
  bricksTexture: Texture;
  ring: LayoutRing;
  dial: LayoutDial;
  dialGame: UseDialGameReturn;
}

/** Two concentric hollow brick rings with dial, hit-zone blocks, glow and miss effects. */
export function BricksRing({ bricksTexture, ring, dial: dialLayout, dialGame }: BricksRingProps) {
  // Bricks ring refs (outer ring)
  const outerRingSpriteRef = useRef<Sprite>(null);
  const outerRingMaskRef = useRef<Graphics>(null);

  // Bricks ring refs (inner ring)
  const innerRingSpriteRef = useRef<Sprite>(null);
  const innerRingMaskRef = useRef<Graphics>(null);

  // Dial (clock-hand) and hit-zone blocks ref
  const dialRef = useRef<Graphics>(null);
  const blocksGfxRef = useRef<Graphics>(null);

  // Hit glow layer
  const glowGfxRef = useRef<Graphics>(null);

  // Miss pulse layer (red hollow ring outlines)
  const missPulseGfxRef = useRef<Graphics>(null);

  // Miss line layer (red radial line from inner to outer ring)
  const missLineGfxRef = useRef<Graphics>(null);

  // Apply ring masks once refs are ready
  useEffect(() => {
    if (outerRingSpriteRef.current && outerRingMaskRef.current) {
      outerRingSpriteRef.current.mask = outerRingMaskRef.current;
    }
    if (innerRingSpriteRef.current && innerRingMaskRef.current) {
      innerRingSpriteRef.current.mask = innerRingMaskRef.current;
    }
  }, [bricksTexture]);

  // Redraw dial, blocks, glow, and miss effects each tick
  useTick((ticker) => {
    const dialGfx = dialRef.current;
    if (!dialGfx) return;

    const dt = ticker.deltaTime / 60;

    // Advance dial via game logic
    const angle = dialGame.tick(dt);

    // Draw dial line
    drawDial(dialGfx, angle, dialLayout);

    // Draw hit-zone blocks with gradient colouring
    if (blocksGfxRef.current) {
      drawBlocks(blocksGfxRef.current, dialGame.blocks.current, dialGame.colorStack.current, ring);
    }

    // Hit glow pulse (targeted to hit block only)
    if (glowGfxRef.current) {
      drawHitGlow(glowGfxRef.current, dialGame.hitGlowTimer.current, dialGame.hitBlockAngles.current, ring);
    }

    // Miss pulse (red hollow ring outlines)
    if (missPulseGfxRef.current) {
      drawMissPulse(missPulseGfxRef.current, dialGame.missPulseTimer.current, ring);
    }

    // Miss line (red radial line from inner ring to outer ring)
    if (missLineGfxRef.current) {
      drawMissLine(missLineGfxRef.current, dialGame.missAngle.current, ring);
    }
  });

  return (
    <>
      {/* Outer ring mask (annulus) */}
      <pixiGraphics
        ref={outerRingMaskRef}
        draw={(g: Graphics) => {
          g.clear();
          g.circle(0, 0, ring.outerRadius);
          g.fill({ color: 0xffffff });
          g.circle(0, 0, ring.outerRadius - ring.ringWidth);
          g.cut();
        }}
      />
      {/* Outer ring sprite */}
      <pixiSprite
        ref={outerRingSpriteRef}
        texture={bricksTexture}
        anchor={0.5}
        width={ring.outerRadius * 2}
        height={ring.outerRadius * 2}
      />

      {/* Hit-zone blocks between the two rings — redrawn each tick */}
      <pixiGraphics
        ref={blocksGfxRef}
        draw={() => { /* initial no-op; redrawn each tick */ }}
      />

      {/* Hit glow layer — redrawn each tick */}
      <pixiGraphics
        ref={glowGfxRef}
        draw={() => { /* initial no-op; redrawn each tick */ }}
      />

      {/* Miss pulse layer (red hollow ring outlines) — redrawn each tick */}
      <pixiGraphics
        ref={missPulseGfxRef}
        draw={() => { /* initial no-op; redrawn each tick */ }}
      />

      {/* Miss line layer (red radial line) — redrawn each tick */}
      <pixiGraphics
        ref={missLineGfxRef}
        draw={() => { /* initial no-op; redrawn each tick */ }}
      />

      {/* Warm red thin dial line — animated via useTick */}
      <pixiGraphics
        ref={dialRef}
        draw={() => { /* initial no-op; redrawn each tick */ }}
      />

      {/* Inner ring mask (annulus) */}
      <pixiGraphics
        ref={innerRingMaskRef}
        draw={(g: Graphics) => {
          g.clear();
          g.circle(0, 0, ring.innerRingOuter);
          g.fill({ color: 0xffffff });
          g.circle(0, 0, ring.innerRingInner);
          g.cut();
        }}
      />
      {/* Inner ring sprite */}
      <pixiSprite
        ref={innerRingSpriteRef}
        texture={bricksTexture}
        anchor={0.5}
        width={ring.innerRingOuter * 2}
        height={ring.innerRingOuter * 2}
      />
    </>
  );
}
