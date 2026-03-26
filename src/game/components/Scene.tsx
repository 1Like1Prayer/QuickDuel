import { useApplication } from "@pixi/react";
import { Container, Sprite, Texture } from "pixi.js";
import { useCallback, useEffect, useRef, useState } from "react";

import { DIAL_BASE_SPEED } from "../constants";
import {
  useBackgroundTexture,
  useBricksTexture,
  useCharacterAnims,
  useBlueLaserFrames,
  useLaserFrames,
} from "../hooks/useAssets";
import { useDialGame } from "../hooks/useDialGame";
import { useGameLoop } from "../hooks/useGameLoop";
import { useLayout } from "../hooks/useLayout";
import { BricksRing } from "./BricksRing/BricksRing";
import { GameText } from "./GameText/GameText";
import { LaserBeam } from "./LaserBeam/LaserBeam";
import { ScoreBar } from "./ScoreBar/ScoreBar";

export function Scene() {
  const { app } = useApplication();

  // Track screen size reactively so layout updates on resize
  const [screenSize, setScreenSize] = useState({ w: app.screen.width, h: app.screen.height });
  const onResize = useCallback(() => {
    setScreenSize({ w: app.screen.width, h: app.screen.height });
  }, [app]);

  useEffect(() => {
    app.renderer.on("resize", onResize);
    return () => { app.renderer.off("resize", onResize); };
  }, [app, onResize]);

  // Responsive layout — recomputes when screen size changes
  const layout = useLayout(screenSize.w, screenSize.h);

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

  // Load assets
  const bgTexture = useBackgroundTexture();
  const bricksTexture = useBricksTexture();

  const { playerAnims, opponentAnims } = useCharacterAnims();

  // Load laser animation frames
  const laserFrames = useLaserFrames();
  const blueLaserFrames = useBlueLaserFrames();

  // Dial game logic
  const dialGame = useDialGame({ baseSpeed: DIAL_BASE_SPEED });

  // Run game loop
  const { showWinText, winTextAlpha, winnerText, countdownText } = useGameLoop({
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

  // Derive initial textures (Idle for intro phase)
  const playerTex = playerAnims ? playerAnims.Idle[0] : Texture.EMPTY;
  const opponentTex = opponentAnims ? opponentAnims.Idle[0] : Texture.EMPTY;

  return (
    <pixiContainer ref={containerRef}>
      <pixiSprite ref={bgRef} texture={bgTexture} x={0} y={0} />

      {/* Two concentric hollow brick rings with dial and effects */}
      {bricksTexture !== Texture.EMPTY && (
        <pixiContainer ref={ringContainerRef} x={layout.positions.meetX} y={layout.positions.meetY} visible={false}>
          <BricksRing
            bricksTexture={bricksTexture}
            ring={layout.ring}
            dial={layout.dial}
            dialGame={dialGame}
          />
        </pixiContainer>
      )}

      {/* Score bar above the ring */}
      <ScoreBar
        x={layout.positions.meetX}
        y={layout.positions.meetY - layout.ring.outerRadius - layout.ring.outerRadius * 0.35}
        ring={layout.ring}
        base={layout.base}
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

      {/* Red laser beam — player (Fire Wizard) */}
      <LaserBeam
        frames={laserFrames}
        sourceRef={laserSourceRef}
        middleRef={laserMiddleRef}
        impactRef={laserImpactRef}
      />

      {/* Blue laser beam — opponent (Wanderer Magician) */}
      <LaserBeam
        frames={blueLaserFrames}
        sourceRef={blueLaserSourceRef}
        middleRef={blueLaserMiddleRef}
        impactRef={blueLaserImpactRef}
      />

      {/* Countdown and win/lose text overlays */}
      <GameText
        screenWidth={screenSize.w}
        screenHeight={screenSize.h}
        fightText={layout.fightText}
        showWinText={showWinText}
        winTextAlpha={winTextAlpha}
        winnerText={winnerText}
        countdownText={countdownText}
      />
    </pixiContainer>
  );
}
