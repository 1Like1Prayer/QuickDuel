import { useApplication, useTick } from "@pixi/react";
import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { useEffect, useRef } from "react";

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
  RING_FADE_IN_DURATION,
  WIN_POINTS,
} from "../constants";
import { useGameStore } from "../../state";
import {
  useBackgroundTexture,
  useBricksTexture,
  useCharacterAnims,
  useBlueLaserFrames,
  useLaserFrames,
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
  const playerRef = useRef<Sprite>(null);
  const opponentRef = useRef<Sprite>(null);
  const laserSourceRef = useRef<Sprite>(null);
  const laserMiddleRef = useRef<Container>(null);
  const laserImpactRef = useRef<Sprite>(null);
  const blueLaserSourceRef = useRef<Sprite>(null);
  const blueLaserMiddleRef = useRef<Container>(null);
  const blueLaserImpactRef = useRef<Sprite>(null);
  const ringContainerRef = useRef<Container>(null);

  // Score bar ref
  const scoreBarGfxRef = useRef<Graphics>(null);
  const scoreBarMidRef = useRef<number | null>(null);
  const scoreBarAlphaRef = useRef(0);
  const scoreBarWasPlaying = useRef(false);

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



  // Load assets
  const bgTexture = useBackgroundTexture();
  const bricksTexture = useBricksTexture();

  const { playerAnims, opponentAnims } = useCharacterAnims();

  // Load laser animation frames
  const laserFrames = useLaserFrames();
  const blueLaserFrames = useBlueLaserFrames();

  // Dial game logic
  const dialGame = useDialGame({ baseSpeed: DIAL_BASE_SPEED });

  // Win text ref
  const winTextRef = useRef<Text>(null);

  // Countdown text ref
  const countdownTextRef = useRef<Text>(null);

  // Run game loop
  const { showWinText, winTextAlpha, winnerText, countdownText } = useGameLoop({
    app,
    refs: {
      container: containerRef,
      bg: bgRef,
      player: playerRef,
      opponent: opponentRef,
      laserSource: laserSourceRef,
      laserMiddle: laserMiddleRef,
      laserImpact: laserImpactRef,
      blueLaserSource: blueLaserSourceRef,
      blueLaserMiddle: blueLaserMiddleRef,
      blueLaserImpact: blueLaserImpactRef,
      ringContainer: ringContainerRef,
    },
    bgTexture,
    laserFrames,
    blueLaserFrames,
    playerAnims,
    opponentAnims,
    dialGame,
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

    // Update countdown text
    if (countdownTextRef.current) {
      const cdText = countdownText.current;
      countdownTextRef.current.visible = cdText !== null;
      if (cdText !== null) {
        countdownTextRef.current.text = cdText;
      }
    }

    // Update "You Win" / "You Lose" text
    if (winTextRef.current) {
      winTextRef.current.text = winnerText.current;
      winTextRef.current.visible = showWinText.current;
      winTextRef.current.alpha = winTextAlpha.current;
    }

    const dt = ticker.deltaTime / 60;

    // Advance dial via game logic
    const angle = dialGame.tick(dt);

    // â”€â”€ Draw dial line â”€â”€
    dial.clear();
    dial.moveTo(0, 0);
    dial.lineTo(
      Math.cos(angle) * layout.dial.dialLength,
      Math.sin(angle) * layout.dial.dialLength,
    );
    dial.stroke({ color: 0xcc3311, width: layout.dial.dialLineWidth, alpha: 0.9 });

    // â”€â”€ Draw hit-zone blocks with gradient colouring â”€â”€
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

    // â”€â”€ Hit glow pulse (targeted to hit block only) â”€â”€
    if (glowGfx) {
      glowGfx.clear();
      const glowT = dialGame.hitGlowTimer.current;
      const hitAngles = dialGame.hitBlockAngles.current;
      if (glowT > 0 && hitAngles) {
        const progress = glowT / HIT_GLOW_DURATION; // 1 â†’ 0
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

    // â”€â”€ Miss pulse (red hollow ring outlines) â”€â”€
    if (missPulseGfx) {
      missPulseGfx.clear();
      const missT = dialGame.missPulseTimer.current;
      if (missT > 0) {
        const progress = missT / MISS_PULSE_DURATION; // 1 â†’ 0
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

    // â”€â”€ Miss line (red radial line from inner edge of inner ring to outer edge of outer ring) â”€â”€
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


    // -- Score bar (above the ring) --
    const scoreBarGfx = scoreBarGfxRef.current;
    if (scoreBarGfx) {
      scoreBarGfx.clear();
      const gamePhase = useGameStore.getState().phase;

      // Show bar during gameplay and fade out when ended
      if (gamePhase === "playing" || (gamePhase === "ended" && scoreBarAlphaRef.current > 0)) {
        // Fade in when transitioning to playing
        if (gamePhase === "playing" && !scoreBarWasPlaying.current) {
          scoreBarWasPlaying.current = true;
          scoreBarAlphaRef.current = 0;
        }
        if (gamePhase === "playing" && scoreBarAlphaRef.current < 1) {
          scoreBarAlphaRef.current = Math.min(1, scoreBarAlphaRef.current + dt / RING_FADE_IN_DURATION);
        }
        // Fade out when ended
        if (gamePhase === "ended") {
          scoreBarAlphaRef.current = Math.max(0, scoreBarAlphaRef.current - dt / RING_FADE_IN_DURATION);
        }
        scoreBarGfx.alpha = scoreBarAlphaRef.current;

        const score = useGameStore.getState().score;
        // Wider bar on bigger screens: scale with screen width, clamped
        const baseBarW = layout.ring.outerRadius * 2;
        const widthMult = Math.min(2.2, Math.max(1, layout.base.width / 800));
        const barWidth = baseBarW * widthMult;
        const barHeight = Math.max(10, layout.ring.outerRadius * 0.14);
        const halfW = barWidth / 2;

        // Score shifts the midpoint: 0 = center, +WIN_POINTS = full red, -WIN_POINTS = full blue
        const pct = Math.min(1, Math.max(-1, score / WIN_POINTS));
        // midpoint ranges from 0 (full blue) to barWidth (full red)
        const targetMid = halfW + halfW * pct;

        // Smooth lerp toward target midpoint
        if (scoreBarMidRef.current === null) {
          scoreBarMidRef.current = targetMid;
        } else {
          const lerpSpeed = 0.08;
          scoreBarMidRef.current += (targetMid - scoreBarMidRef.current) * lerpSpeed;
        }
        const mid = scoreBarMidRef.current;

        // Red half: left edge to midpoint
        if (mid > 0) {
          scoreBarGfx.rect(-halfW, -barHeight / 2, mid, barHeight);
          scoreBarGfx.fill({ color: 0xff3333, alpha: 0.9 });
        }
        // Blue half: midpoint to right edge
        if (mid < barWidth) {
          const blueW = barWidth - mid;
          scoreBarGfx.rect(-halfW + mid, -barHeight / 2, blueW, barHeight);
          scoreBarGfx.fill({ color: 0x3388ff, alpha: 0.9 });
        }
      } else {
        // Reset state when fully faded or in intro
        scoreBarMidRef.current = null;
        scoreBarWasPlaying.current = false;
        scoreBarGfx.alpha = 0;
      }
    }
  });

  // Derive initial textures (Idle for intro phase)
  const playerTex = playerAnims ? playerAnims.Idle[0] : Texture.EMPTY;
  const opponentTex = opponentAnims ? opponentAnims.Idle[0] : Texture.EMPTY;

  return (
    <pixiContainer ref={containerRef}>
      <pixiSprite ref={bgRef} texture={bgTexture} x={0} y={0} />

      {/* Two concentric hollow brick rings */}
      {bricksTexture !== Texture.EMPTY && (
        <pixiContainer ref={ringContainerRef} x={layout.positions.meetX} y={layout.positions.meetY} visible={false}>
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

          {/* Hit-zone blocks between the two rings â€” redrawn each tick */}
          <pixiGraphics
            ref={blocksGfxRef}
            draw={() => {
              /* initial no-op; redrawn each tick */
            }}
          />

          {/* Hit glow layer â€” redrawn each tick */}
          <pixiGraphics
            ref={glowGfxRef}
            draw={() => {
              /* initial no-op; redrawn each tick */
            }}
          />

          {/* Miss pulse layer (red hollow ring outlines) â€” redrawn each tick */}
          <pixiGraphics
            ref={missPulseGfxRef}
            draw={() => {
              /* initial no-op; redrawn each tick */
            }}
          />

          {/* Miss line layer (red radial line) â€” redrawn each tick */}
          <pixiGraphics
            ref={missLineGfxRef}
            draw={() => {
              /* initial no-op; redrawn each tick */
            }}
          />

          {/* Warm red thin dial line â€” animated via useTick */}
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

      {/* Score bar above the ring */}
      <pixiGraphics
        ref={scoreBarGfxRef}
        x={layout.positions.meetX}
        y={
          layout.positions.meetY -
          layout.ring.outerRadius -
          layout.ring.outerRadius * 0.35
        }
        draw={() => {
          /* redrawn each tick */
        }}
      />

      <pixiSprite
        ref={playerRef}
        texture={playerTex}
        x={layout.positions.charStartX}
        y={layout.positions.groundY}
        scale={layout.characters.charScale}
      />
      <pixiSprite
        ref={opponentRef}
        texture={opponentTex}
        x={layout.positions.charEndX}
        y={layout.positions.groundY}
        scale={layout.characters.charScale}
      />

      {/* Laser beam — 3-section: source, tiled middle, impact */}
      <pixiSprite
        ref={laserSourceRef}
        texture={laserFrames ? laserFrames.sourceStart[0] : Texture.EMPTY}
        visible={false}
        anchor={{ x: 0, y: 0.5 }}
      />
      <pixiContainer ref={laserMiddleRef} visible={false} />
      <pixiSprite
        ref={laserImpactRef}
        texture={laserFrames ? laserFrames.impactStart[0] : Texture.EMPTY}
        visible={false}
        anchor={{ x: 0, y: 0.5 }}
      />

      {/* Blue laser beam — opponent (Wanderer Magician) */}
      <pixiSprite
        ref={blueLaserSourceRef}
        texture={blueLaserFrames ? blueLaserFrames.sourceStart[0] : Texture.EMPTY}
        visible={false}
        anchor={{ x: 0, y: 0.5 }}
      />
      <pixiContainer ref={blueLaserMiddleRef} visible={false} />
      <pixiSprite
        ref={blueLaserImpactRef}
        texture={blueLaserFrames ? blueLaserFrames.impactStart[0] : Texture.EMPTY}
        visible={false}
        anchor={{ x: 0, y: 0.5 }}
      />

      {/* Countdown text â€” "3", "2", "1", "FIGHT!" during countdown phase */}
      <pixiText
        ref={countdownTextRef}
        text="3"
        anchor={0.5}
        x={app.screen.width / 2}
        y={app.screen.height / 2 - layout.fightText.fightFontSize * 0.8}
        style={{
          fontFamily: "Arial Black, Impact, sans-serif",
          fontSize: layout.fightText.fightFontSize * 1.5,
          fontWeight: "bold" as const,
          fill: 0xffffff,
          stroke: { color: 0x000000, width: layout.fightText.fightStrokeWidth * 1.5 },
          dropShadow: {
            alpha: 0.7,
            angle: Math.PI / 4,
            blur: 6,
            distance: 5,
            color: 0x000000,
          },
        }}
        visible={false}
      />

      {/* "You Win" text â€” fades in after opponent death */}
      <pixiText
        ref={winTextRef}
        text="You Win"
        anchor={0.5}
        x={app.screen.width / 2}
        y={app.screen.height * 0.22}
        style={{
          fontFamily: "Arial Black, Impact, sans-serif",
          fontSize: layout.fightText.fightFontSize * 1.8,
          fontWeight: "bold" as const,
          fill: 0xffcc00,
          stroke: { color: 0x000000, width: layout.fightText.fightStrokeWidth * 1.8 },
          dropShadow: {
            alpha: 0.6,
            angle: Math.PI / 4,
            blur: 6,
            distance: 6,
            color: 0x000000,
          },
        }}
        visible={false}
        alpha={0}
      />
    </pixiContainer>
  );
}
