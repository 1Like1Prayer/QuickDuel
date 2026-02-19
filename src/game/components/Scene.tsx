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
  MISS_LINE_WIDTH_FACTOR,
  MISS_PULSE_COLOR,
  MISS_PULSE_DURATION,
  MISS_PULSE_MAX_ALPHA,
} from "../constants";
import {
  useBackgroundTexture,
  useBricksTexture,
  useCharacterAnims,
} from "../hooks/useAssets";
import { useDialGame } from "../hooks/useDialGame";
import { blockColor } from "../hooks/utils/useDialGame.utils";
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

  // Miss pulse layer (red hollow ring outlines)
  const missPulseGfxRef = useRef<Graphics>(null);

  // Miss line layer (red radial line from inner to outer ring)
  const missLineGfxRef = useRef<Graphics>(null);

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

  // Animate the dial, redraw hit-zone blocks, glow, miss pulse, katanas, and toggle FIGHT text each tick
  useTick((ticker) => {
    const dial = dialRef.current;
    const blocksGfx = blocksGfxRef.current;
    const glowGfx = glowGfxRef.current;
    const missPulseGfx = missPulseGfxRef.current;
    const missLineGfx = missLineGfxRef.current;
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
      Math.cos(angle) * layout.dial.dialLength,
      Math.sin(angle) * layout.dial.dialLength,
    );
    dial.stroke({ color: 0xcc3311, width: layout.dial.dialLineWidth, alpha: 0.9 });

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
          Math.cos(block.startAngle) * layout.ring.gapOuter,
          Math.sin(block.startAngle) * layout.ring.gapOuter,
        );
        for (let i = 1; i <= steps; i++) {
          const a = block.startAngle + angleStep * i;
          blocksGfx.lineTo(
            Math.cos(a) * layout.ring.gapOuter,
            Math.sin(a) * layout.ring.gapOuter,
          );
        }
        for (let i = steps; i >= 0; i--) {
          const a = block.startAngle + angleStep * i;
          blocksGfx.lineTo(
            Math.cos(a) * layout.ring.gapInner,
            Math.sin(a) * layout.ring.gapInner,
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
          Math.cos(hitAngles.startAngle) * layout.ring.gapOuter,
          Math.sin(hitAngles.startAngle) * layout.ring.gapOuter,
        );
        for (let i = 1; i <= segs; i++) {
          const a = hitAngles.startAngle + angleStep * i;
          glowGfx.lineTo(
            Math.cos(a) * layout.ring.gapOuter,
            Math.sin(a) * layout.ring.gapOuter,
          );
        }
        for (let i = segs; i >= 0; i--) {
          const a = hitAngles.startAngle + angleStep * i;
          glowGfx.lineTo(
            Math.cos(a) * layout.ring.gapInner,
            Math.sin(a) * layout.ring.gapInner,
          );
        }
        glowGfx.closePath();
        glowGfx.fill({ color: HIT_GLOW_COLOR, alpha });
      } else {
        glowGfx.scale.set(1);
      }
    }

    // ── Miss pulse (red hollow ring outlines) ──
    if (missPulseGfx) {
      missPulseGfx.clear();
      const missT = dialGame.missPulseTimer.current;
      if (missT > 0) {
        const progress = missT / MISS_PULSE_DURATION; // 1 → 0
        const alpha = progress * MISS_PULSE_MAX_ALPHA;
        const pulseScale = 1 + 0.08 * (1 - progress); // expand outward as it fades
        missPulseGfx.scale.set(pulseScale);

        const strokeWidth = Math.max(1.5, layout.ring.outerRadius * 0.03);

        // Outer ring red hollow circle
        missPulseGfx.circle(0, 0, layout.ring.outerRadius);
        missPulseGfx.stroke({
          color: MISS_PULSE_COLOR,
          width: strokeWidth,
          alpha,
        });

        // Inner ring red hollow circle
        missPulseGfx.circle(0, 0, layout.ring.innerRingOuter);
        missPulseGfx.stroke({
          color: MISS_PULSE_COLOR,
          width: strokeWidth,
          alpha,
        });
      } else {
        missPulseGfx.scale.set(1);
      }
    }

    // ── Miss line (red radial line from inner edge of inner ring to outer edge of outer ring) ──
    if (missLineGfx) {
      missLineGfx.clear();
      const mAngle = dialGame.missAngle.current;
      if (mAngle !== null) {
        const lineWidth = Math.max(
          2,
          layout.ring.outerRadius * MISS_LINE_WIDTH_FACTOR,
        );
        missLineGfx.moveTo(
          Math.cos(mAngle) * layout.ring.innerRingInner,
          Math.sin(mAngle) * layout.ring.innerRingInner,
        );
        missLineGfx.lineTo(
          Math.cos(mAngle) * layout.ring.outerRadius,
          Math.sin(mAngle) * layout.ring.outerRadius,
        );
        missLineGfx.stroke({
          color: MISS_PULSE_COLOR,
          width: lineWidth,
          alpha: 0.85,
        });
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
        s.width = layout.katana.katanaSize;
        s.height = layout.katana.katanaSize;
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
        count * layout.katana.katanaSize +
        Math.max(0, count - 1) * layout.katana.katanaSpacing;
      const startX = -totalWidth / 2 + layout.katana.katanaSize / 2;

      for (let i = 0; i < count; i++) {
        const s = katanaSpritesRef.current[i];
        s.width = layout.katana.katanaSize;
        s.height = layout.katana.katanaSize;
        s.x = startX + i * (layout.katana.katanaSize + layout.katana.katanaSpacing);
        s.y = 0;
        s.tint = colors[i];
      }

      prevKatanaCount.current = count;

      // Draw katana background pill
      const katanaBg = katanaBgRef.current;
      if (katanaBg) {
        katanaBg.clear();
        if (count > 0) {
          const pad = layout.katana.katanaSize * 0.22;
          const bgW = totalWidth + pad * 2;
          const bgH = layout.katana.katanaSize + pad * 2;
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
    fontSize: layout.fightText.fightFontSize,
    fontWeight: "bold" as const,
    fill: 0xffcc00,
    stroke: { color: 0x000000, width: layout.fightText.fightStrokeWidth },
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
        <pixiContainer x={layout.positions.meetX} y={layout.positions.meetY}>
          {/* Outer ring mask (annulus) */}
          <pixiGraphics
            ref={outerRingMaskRef}
            draw={(g: Graphics) => {
              g.clear();
              g.circle(0, 0, layout.ring.outerRadius);
              g.fill({ color: 0xffffff });
              g.circle(0, 0, layout.ring.outerRadius - layout.ring.ringWidth);
              g.cut();
            }}
          />
          {/* Outer ring sprite */}
          <pixiSprite
            ref={outerRingSpriteRef}
            texture={bricksTexture}
            anchor={0.5}
            width={layout.ring.outerRadius * 2}
            height={layout.ring.outerRadius * 2}
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

          {/* Miss pulse layer (red hollow ring outlines) — redrawn each tick */}
          <pixiGraphics
            ref={missPulseGfxRef}
            draw={() => {
              /* initial no-op; redrawn each tick */
            }}
          />

          {/* Miss line layer (red radial line) — redrawn each tick */}
          <pixiGraphics
            ref={missLineGfxRef}
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
              g.circle(0, 0, layout.ring.innerRingOuter);
              g.fill({ color: 0xffffff });
              g.circle(0, 0, layout.ring.innerRingInner);
              g.cut();
            }}
          />
          {/* Inner ring sprite */}
          <pixiSprite
            ref={innerRingSpriteRef}
            texture={bricksTexture}
            anchor={0.5}
            width={layout.ring.innerRingOuter * 2}
            height={layout.ring.innerRingOuter * 2}
          />
        </pixiContainer>
      )}

      {/* Katana hit streak below the ring */}
      <pixiContainer
        ref={katanaContainerRef}
        x={layout.positions.meetX}
        y={
          layout.positions.meetY +
          layout.ring.outerRadius +
          layout.katana.katanaSize * 0.4 +
          layout.katana.katanaSize / 2
        }
      >
        <pixiGraphics
          ref={katanaBgRef}
          draw={() => {
            /* redrawn each tick */
          }}
        />
      </pixiContainer>

      <pixiSprite
        ref={samuraiRef}
        texture={samuraiTex}
        x={layout.positions.charStartX}
        y={layout.positions.groundY}
        scale={layout.characters.charScale}
      />
      <pixiSprite
        ref={shinobiRef}
        texture={shinobiTex}
        x={layout.positions.charEndX}
        y={layout.positions.groundY}
        scale={layout.characters.charScale}
      />

      {/* "FIGHT!" text — shown during fight_text phase */}
      <pixiText
        ref={fightTextRef}
        text="FIGHT!"
        anchor={0.5}
        x={app.screen.width / 2}
        y={app.screen.height / 2 - layout.fightText.fightFontSize * 0.5}
        style={fightTextStyle}
        visible={false}
      />
    </pixiContainer>
  );
}
