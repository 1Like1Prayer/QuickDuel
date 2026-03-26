import { useTick } from "@pixi/react";
import { Texture } from "pixi.js";
import { useEffect } from "react";

import { copies } from "../../copies";
import { useGameStore } from "../../state";
import type { Phase } from "../types";
import { useAudioManager } from "./useAudioManager";
import { useCpuOpponent } from "./useCpuOpponent";
import { useLaserRenderer } from "./useLaserRenderer";
import { useParticleEffects } from "./useParticleEffects";
import { usePhaseStateMachine } from "./usePhaseStateMachine";
import { useScreenShake } from "./useScreenShake";
import type { GameLoopParams } from "./types/useGameLoop.types";

export function useGameLoop({
  refs,
  bgTexture,
  laserFrames,
  blueLaserFrames,
  playerAnims,
  opponentAnims,
  dialGame,
  layout,
}: GameLoopParams) {
  const audio = useAudioManager();
  const shake = useScreenShake();
  const cpu = useCpuOpponent();
  const particles = useParticleEffects(refs.container);
  const phase = usePhaseStateMachine(layout.positions.charStartX, layout.positions.charEndX);
  const laser = useLaserRenderer(laserFrames, blueLaserFrames, layout, audio);

  // ── Round outcome resolution ──

  const resolveRoundOutcome = (playerPoints: number, cpuPoints: number) => {
    const pointDelta = playerPoints - cpuPoints;
    useGameStore.getState().resolveRound(playerPoints, cpuPoints);

    const { sfxEnabled, muted } = useGameStore.getState();
    const canPlaySfx = sfxEnabled && !muted;
    if (canPlaySfx && pointDelta > 0) audio.playOneShot(audio.fireImpact);
    else if (canPlaySfx && pointDelta < 0) audio.playOneShot(audio.lightImpact);

    const storePhase = useGameStore.getState().phase;
    if (
      storePhase === "ended" &&
      phase.currentPhase.current !== "player_lose" &&
      phase.currentPhase.current !== "player_win"
    ) {
      const playerWon = useGameStore.getState().score > 0;
      if (playerWon) {
        phase.resultTextContent.current = copies.game.result.youWin;
        phase.currentPhase.current = "player_win";
        dialGame.stop();
        shake.trigger();
        particles.spawnExplosionAt(
          phase.opponentPositionX.current + layout.characters.charSize * 0.5,
          layout.positions.groundY + layout.characters.charSize * 0.4,
        );
        if (canPlaySfx) audio.playOneShot(audio.fireLaunch);
      } else {
        phase.resultTextContent.current = copies.game.result.youLose;
        phase.currentPhase.current = "player_lose";
        dialGame.stop();
        shake.trigger();
        particles.spawnExplosionAt(
          phase.playerPositionX.current + layout.characters.charSize * 0.5,
          layout.positions.groundY + layout.characters.charSize * 0.4,
        );
        if (canPlaySfx) audio.playOneShot(audio.lightLaunch);
      }
      return;
    }

    shake.trigger();
    if (pointDelta === 0) {
      const clashX = (laser.laserClashPointLerpedX.current ?? layout.positions.meetX) - layout.characters.charSize * 0.3;
      const clashY = layout.positions.groundY + layout.characters.charSize * 0.66;
      particles.spawnSparksAt(clashX, clashY);
      if (canPlaySfx) audio.playOneShot(audio.beamClash);
    }
  };

  // ── Reset helper ──

  const resetAllTransientState = () => {
    phase.resetAll(dialGame, refs.ringContainer.current);
    cpu.reset();
    particles.sparkParticles.current = [];
    particles.explosionParticles.current = [];
    laser.reset();
  };

  // ── Input listener for dial game (Space / click / tap) ──

  useEffect(() => {
    const inputAllowedPhases: Phase[] = ["idle"];

    const handleInput = (event?: KeyboardEvent) => {
      if (event && event.key !== " ") return;
      if (event) event.preventDefault();

      if (!inputAllowedPhases.includes(phase.currentPhase.current)) return;
      if (!dialGame.active.current) return;

      const hitResult = dialGame.attempt();
      if (hitResult === null) return;

      const cpuPoints = cpu.executeTurn();
      const playerPoints = hitResult ? dialGame.lastHitPoints.current : 0;
      resolveRoundOutcome(playerPoints, cpuPoints);
    };

    const onKeyDown = (event: KeyboardEvent) => handleInput(event);
    const onPointerDown = () => handleInput();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialGame]);

  // ── Debug key listener ──

  useEffect(() => {
    const DEBUG_SCORE_MAP: Record<string, number> = { "1": -9, "2": -8, "3": 9, "4": 8 };
    const onDebugKey = (event: KeyboardEvent) => {
      const target = DEBUG_SCORE_MAP[event.key];
      if (target !== undefined && useGameStore.getState().phase === "playing") {
        useGameStore.getState().debugSetScore(target);
      }
    };
    window.addEventListener("keydown", onDebugKey);
    return () => { window.removeEventListener("keydown", onDebugKey); };
  }, []);

  // ── Main tick ──

  useTick((ticker) => {
    const { container, bg, player, opponent } = refs;
    if (!player.current || !opponent.current || !container.current || !bg.current) return;
    if (!playerAnims || !opponentAnims) return;

    // Background "cover" scaling — fill screen while preserving aspect ratio
    if (bgTexture !== Texture.EMPTY) {
      const screenWidth = layout.base.width;
      const screenHeight = layout.base.height;
      const bgCoverScale = Math.max(screenWidth / bgTexture.width, screenHeight / bgTexture.height);
      bg.current.scale.set(bgCoverScale);
      bg.current.x = (screenWidth - bgTexture.width * bgCoverScale) / 2;
      bg.current.y = (screenHeight - bgTexture.height * bgCoverScale) / 2;
    }

    /** Normalised delta time (seconds per tick at 60 fps). */
    const dt = ticker.deltaTime / 60;
    const activePhase = phase.currentPhase.current;

    // Handle game restart detection
    if (
      (activePhase === "player_win" || activePhase === "player_lose") &&
      useGameStore.getState().phase !== "ended"
    ) {
      resetAllTransientState();
    }

    // Phase state machine update
    phase.update({
      dt,
      player: player.current,
      opponent: opponent.current,
      playerAnims,
      opponentAnims,
      dialGame,
      ringContainer: refs.ringContainer.current,
    });

    // CPU takes a turn each time the dial crosses the regeneration gate
    const currentRegenCount = dialGame.regenCount.current;
    if (currentRegenCount > cpu.previousRegenGateCount.current) {
      const isFirstCrossing = cpu.previousRegenGateCount.current === 0;
      cpu.previousRegenGateCount.current = currentRegenCount;
      if (!isFirstCrossing && !cpu.turnTakenThisLap.current && phase.currentPhase.current !== "attack_intro") {
        const cpuPoints = cpu.executeTurn();
        resolveRoundOutcome(0, cpuPoints);
      }
      cpu.turnTakenThisLap.current = false;
    }

    // Sync character positions from layout
    phase.playerPositionX.current = layout.positions.charStartX;
    phase.opponentPositionX.current = layout.positions.charEndX;

    player.current.x = phase.playerPositionX.current;
    player.current.y = layout.positions.groundY;
    player.current.scale.set(layout.characters.charScale);
    player.current.scale.x = layout.characters.charScale;
    player.current.anchor.x = 0;

    opponent.current.x = phase.opponentPositionX.current;
    opponent.current.y = layout.positions.groundY;
    opponent.current.scale.set(layout.characters.charScale);
    opponent.current.scale.x = -layout.characters.charScale;
    opponent.current.anchor.x = 1;

    if (refs.ringContainer.current) {
      refs.ringContainer.current.x = layout.positions.meetX;
      refs.ringContainer.current.y = layout.positions.meetY;
    }

    // Laser rendering
    const shouldShowLaser =
      phase.hasAttackIntroCompleted.current &&
      activePhase !== "intro" &&
      activePhase !== "attack_intro" &&
      activePhase !== "player_win" &&
      activePhase !== "player_lose";

    const redSource = refs.laserSource.current;
    const redMiddle = refs.laserMiddle.current;
    const redImpact = refs.laserImpact.current;

    if (redSource && redMiddle && redImpact) {
      laser.update({
        dt,
        shouldShow: shouldShowLaser,
        playerX: phase.playerPositionX.current,
        opponentX: phase.opponentPositionX.current,
        redSource,
        redMiddle,
        redImpact,
        blueSource: refs.blueLaserSource.current,
        blueMiddle: refs.blueLaserMiddle.current,
        blueImpact: refs.blueLaserImpact.current,
      });
    }

    // Screen shake
    shake.update(dt, container.current, layout.movement.shakeIntensity);

    // Particles
    particles.update(dt);
  });

  return {
    showWinText: phase.isResultTextVisible,
    winTextAlpha: phase.resultTextOpacity,
    winnerText: phase.resultTextContent,
    countdownText: phase.countdownLabel,
  };
}
