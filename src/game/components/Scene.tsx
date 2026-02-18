import { useApplication, useTick } from "@pixi/react";
import { Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { useEffect, useRef, useState } from "react";

import {
  BLOCK_ALPHA,
  BLOCK_ARC_SEGMENTS,
  DIAL_BASE_SPEED,
  HIT_GLOW_COLOR,
  HIT_GLOW_DURATION,
  HIT_GLOW_MAX_ALPHA,
  MAX_KATANA_COUNT,
} from "../constants";
import {
  useBackgroundTexture,
  useBricksTexture,
  useCharacterAnims,
} from "../hooks/useAssets";
import { useDialGame } from "../hooks/useDialGame";
import { blockColor } from "../hooks/useDialGame";
import { useGameLoop } from "../hooks/useGameLoop";
import { useLayout } from "../hooks/useLayout";

export function Scene() {
  const { app } = useApplication();

  // Responsive layout
  const layout = useLayout(app.screen.width, app.screen.height);

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

  // Hit glow layer
  const glowGfxRef = useRef<Graphics>(null);

  // Katana background
  const katanaBgRef = useRef<Graphics>(null);

  // Katana streak
  const [katanaTexture, setKatanaTexture] = useState(Texture.EMPTY);
  const katanaContainerRef = useRef<Container>(null);
  const katanaSpritesRef = useRef<Sprite[]>([]);
  const prevKatanaCount = useRef(0);

  // Load assets
  const bgTexture = useBackgroundTexture();
  const bricksTexture = useBricksTexture();

  const { samuraiAnims, shinobiAnims } = useCharacterAnims();

  // Load katana texture
  useEffect(() => {
    Assets.load("/katana.png").then(setKatanaTexture);
  }, []);

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
    layout,
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

  // Animate the dial, redraw hit-zone blocks, glow, katanas, and toggle FIGHT text each tick
  useTick((ticker) => {
    const dial = dialRef.current;
    const blocksGfx = blocksGfxRef.current;
    const glowGfx = glowGfxRef.current;
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
    dial.lineTo(
      Math.cos(angle) * layout.dialLength,
      Math.sin(angle) * layout.dialLength,
    );
    dial.stroke({ color: 0xcc3311, width: layout.dialLineWidth, alpha: 0.9 });

    // ── Draw hit-zone blocks with gradient colouring ──
    if (blocksGfx) {
      blocksGfx.clear();
      const currentBlocks = dialGame.blocks.current;
      const steps = BLOCK_ARC_SEGMENTS;

      for (const block of currentBlocks) {
        const arcSpan = block.endAngle - block.startAngle;
        const angleStep = arcSpan / steps;
        const color = blockColor(block, dialGame.colorStack.current);

        // Build annular wedge path
        blocksGfx.moveTo(
          Math.cos(block.startAngle) * layout.gapOuter,
          Math.sin(block.startAngle) * layout.gapOuter,
        );
        for (let i = 1; i <= steps; i++) {
          const a = block.startAngle + angleStep * i;
          blocksGfx.lineTo(
            Math.cos(a) * layout.gapOuter,
            Math.sin(a) * layout.gapOuter,
          );
        }
        for (let i = steps; i >= 0; i--) {
          const a = block.startAngle + angleStep * i;
          blocksGfx.lineTo(
            Math.cos(a) * layout.gapInner,
            Math.sin(a) * layout.gapInner,
          );
        }
        blocksGfx.closePath();
        blocksGfx.fill({ color, alpha: BLOCK_ALPHA });
      }
    }

    // ── Hit glow pulse (targeted to hit block only) ──
    if (glowGfx) {
      glowGfx.clear();
      const glowT = dialGame.hitGlowTimer.current;
      const hitAngles = dialGame.hitBlockAngles.current;
      if (glowT > 0 && hitAngles) {
        const progress = glowT / HIT_GLOW_DURATION; // 1 → 0
        const alpha = progress * HIT_GLOW_MAX_ALPHA;
        const scale = 1 + 0.1 * progress;
        glowGfx.scale.set(scale);

        // Draw an annular wedge over only the hit block
        const segs = 16;
        const arcSpan = hitAngles.endAngle - hitAngles.startAngle;
        const angleStep = arcSpan / segs;

        glowGfx.moveTo(
          Math.cos(hitAngles.startAngle) * layout.gapOuter,
          Math.sin(hitAngles.startAngle) * layout.gapOuter,
        );
        for (let i = 1; i <= segs; i++) {
          const a = hitAngles.startAngle + angleStep * i;
          glowGfx.lineTo(
            Math.cos(a) * layout.gapOuter,
            Math.sin(a) * layout.gapOuter,
          );
        }
        for (let i = segs; i >= 0; i--) {
          const a = hitAngles.startAngle + angleStep * i;
          glowGfx.lineTo(
            Math.cos(a) * layout.gapInner,
            Math.sin(a) * layout.gapInner,
          );
        }
        glowGfx.closePath();
        glowGfx.fill({ color: HIT_GLOW_COLOR, alpha });
      } else {
        glowGfx.scale.set(1);
      }
    }

    // ── Katana hit streak ──
    const katanaContainer = katanaContainerRef.current;
    if (katanaContainer && katanaTexture !== Texture.EMPTY) {
      const colors = dialGame.hitColors.current;
      const count = colors.length;

      // Add / remove sprites to match count
      while (katanaSpritesRef.current.length < count) {
        const s = new Sprite(katanaTexture);
        s.width = layout.katanaSize;
        s.height = layout.katanaSize;
        s.anchor.set(0.5);
        katanaContainer.addChild(s);
        katanaSpritesRef.current.push(s);
      }
      while (katanaSpritesRef.current.length > count) {
        const removed = katanaSpritesRef.current.shift()!;
        katanaContainer.removeChild(removed);
        removed.destroy();
      }

      // Position & tint
      const totalWidth =
        count * layout.katanaSize +
        Math.max(0, count - 1) * layout.katanaSpacing;
      const startX = -totalWidth / 2 + layout.katanaSize / 2;

      for (let i = 0; i < count; i++) {
        const s = katanaSpritesRef.current[i];
        s.width = layout.katanaSize;
        s.height = layout.katanaSize;
        s.x = startX + i * (layout.katanaSize + layout.katanaSpacing);
        s.y = 0;
        s.tint = colors[i];
      }

      prevKatanaCount.current = count;

      // Draw katana background pill
      const katanaBg = katanaBgRef.current;
      if (katanaBg) {
        katanaBg.clear();
        if (count > 0) {
          const pad = layout.katanaSize * 0.22;
          const bgW = totalWidth + pad * 2;
          const bgH = layout.katanaSize + pad * 2;
          katanaBg.roundRect(-bgW / 2, -bgH / 2, bgW, bgH, bgH / 2);
          katanaBg.fill({ color: 0x000000, alpha: 0.45 });
        }
      }
    }
  });

  // Derive initial textures
  const samuraiTex = samuraiAnims ? samuraiAnims.Run[0] : Texture.EMPTY;
  const shinobiTex = shinobiAnims ? shinobiAnims.Run[0] : Texture.EMPTY;

  // Fight text style (dynamic font size)
  const fightTextStyle = {
    fontFamily: "Arial Black, Impact, sans-serif",
    fontSize: layout.fightFontSize,
    fontWeight: "bold" as const,
    fill: 0xffcc00,
    stroke: { color: 0x000000, width: layout.fightStrokeWidth },
    dropShadow: {
      alpha: 0.6,
      angle: Math.PI / 4,
      blur: 4,
      distance: 4,
      color: 0x000000,
    },
  };

  return (
    <pixiContainer ref={containerRef}>
      <pixiSprite ref={bgRef} texture={bgTexture} x={0} y={0} />

      {/* Two concentric hollow brick rings */}
      {bricksTexture !== Texture.EMPTY && (
        <pixiContainer x={layout.meetX} y={layout.meetY}>
          {/* Outer ring mask (annulus) */}
          <pixiGraphics
            ref={outerRingMaskRef}
            draw={(g: Graphics) => {
              g.clear();
              g.circle(0, 0, layout.outerRadius);
              g.fill({ color: 0xffffff });
              g.circle(0, 0, layout.outerRadius - layout.ringWidth);
              g.cut();
            }}
          />
          {/* Outer ring sprite */}
          <pixiSprite
            ref={outerRingSpriteRef}
            texture={bricksTexture}
            anchor={0.5}
            width={layout.outerRadius * 2}
            height={layout.outerRadius * 2}
          />

          {/* Hit-zone blocks between the two rings — redrawn each tick */}
          <pixiGraphics
            ref={blocksGfxRef}
            draw={() => {
              /* initial no-op; redrawn each tick */
            }}
          />

          {/* Hit glow layer — redrawn each tick */}
          <pixiGraphics
            ref={glowGfxRef}
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
              g.circle(0, 0, layout.innerRingOuter);
              g.fill({ color: 0xffffff });
              g.circle(0, 0, layout.innerRingInner);
              g.cut();
            }}
          />
          {/* Inner ring sprite */}
          <pixiSprite
            ref={innerRingSpriteRef}
            texture={bricksTexture}
            anchor={0.5}
            width={layout.innerRingOuter * 2}
            height={layout.innerRingOuter * 2}
          />
        </pixiContainer>
      )}

      {/* Katana hit streak below the ring */}
      <pixiContainer
        ref={katanaContainerRef}
        x={layout.meetX}
        y={layout.meetY + layout.outerRadius + layout.katanaSize * 0.4 + layout.katanaSize / 2}
      >
        <pixiGraphics
          ref={katanaBgRef}
          draw={() => { /* redrawn each tick */ }}
        />
      </pixiContainer>

      <pixiSprite
        ref={samuraiRef}
        texture={samuraiTex}
        x={layout.charStartX}
        y={layout.groundY}
        scale={layout.charScale}
      />
      <pixiSprite
        ref={shinobiRef}
        texture={shinobiTex}
        x={layout.charEndX}
        y={layout.groundY}
        scale={layout.charScale}
      />

      {/* "FIGHT!" text — shown during fight_text phase */}
      <pixiText
        ref={fightTextRef}
        text="FIGHT!"
        anchor={0.5}
        x={app.screen.width / 2}
        y={app.screen.height / 2 - layout.fightFontSize * 0.5}
        style={fightTextStyle}
        visible={false}
      />
    </pixiContainer>
  );
}
