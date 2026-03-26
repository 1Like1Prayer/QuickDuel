import { useTick } from "@pixi/react";
import { Graphics, Sprite, Texture } from "pixi.js";
import { useEffect, useRef } from "react";
import { copies } from "../../copies";

import {
  ANIM_SPEED,
  COUNTDOWN_FIGHT_MS,
  COUNTDOWN_STEP_MS,
  LASER_ANIM_SPEED,
  RING_FADE_IN_DURATION,
  SHAKE_DURATION,
  SLOWMO_ANIM_SPEED,
  WIN_POINTS,
  WIN_TEXT_FADE_DURATION,
} from "../constants";
import { useGameStore } from "../../state";
import type { Phase } from "../types";
import type { SparkParticle, ExplosionParticle } from "../utils/particles";
import {
  spawnExplosion,
  spawnSparks,
  updateExplosionParticles,
  updateSparkParticles,
} from "../utils/particles";
import { getAnimName } from "../utils/phases";
import { cpuTakeTurn, createCpuState } from "../services/cpuService";
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
  const sparkGraphicsLayer = useRef<Graphics | null>(null);
  const explosionGraphicsLayer = useRef<Graphics | null>(null);

  const isResultTextVisible = useRef(false);
  const resultTextOpacity = useRef(0);
  const resultTextContent = useRef(copies.game.result.youWin);

  const countdownLabel = useRef<string | null>(null);
  const ringContainerOpacity = useRef(0);
  const laserClashPointLerpedX = useRef<number | null>(null);
  const redImpactClampedX = useRef<number | null>(null);

  const currentPhase = useRef<Phase>("intro");

  const playerPositionX = useRef(layout.positions.charStartX);
  const opponentPositionX = useRef(layout.positions.charEndX);

  const playerAnimFrameIndex = useRef(0);
  const opponentAnimFrameIndex = useRef(0);
  const playerAnimTimer = useRef(0);
  const opponentAnimTimer = useRef(0);
  const isPhaseAnimationComplete = useRef(false);

  const hasAttackIntroCompleted = useRef(false);

  const screenShakeTimeRemaining = useRef(0);
  const isScreenShaking = useRef(false);

  const sparkParticles = useRef<SparkParticle[]>([]);
  const explosionParticles = useRef<ExplosionParticle[]>([]);

  // ── Sound effects ──

  const fireBeamLoopAudio = useRef<HTMLAudioElement | null>(null);
  if (!fireBeamLoopAudio.current) {
    const audio = new Audio("/sounds/EM_FIRE_HOLD_4s.ogg");
    audio.loop = true;
    audio.volume = 0.8;
    fireBeamLoopAudio.current = audio;
  }
  const lightBeamLoopAudio = useRef<HTMLAudioElement | null>(null);
  if (!lightBeamLoopAudio.current) {
    const audio = new Audio("/sounds/EM_LIGHT_HOLD_5s.ogg");
    audio.loop = true;
    audio.volume = 0.8;
    lightBeamLoopAudio.current = audio;
  }
  const lightCastOneShotAudio = useRef<HTMLAudioElement | null>(null);
  if (!lightCastOneShotAudio.current) {
    const audio = new Audio("/sounds/EM_LIGHT_CAST_02_S.ogg");
    audio.loop = false;
    audio.volume = 0.8;
    lightCastOneShotAudio.current = audio;
  }
  const fireCastOneShotAudio = useRef<HTMLAudioElement | null>(null);
  if (!fireCastOneShotAudio.current) {
    const audio = new Audio("/sounds/EM_FIRE_CAST_02.ogg");
    audio.loop = false;
    audio.volume = 0.8;
    fireCastOneShotAudio.current = audio;
  }
  const isBeamAudioPlaying = useRef(false);

  const fireImpactAudio = useRef<HTMLAudioElement | null>(null);
  if (!fireImpactAudio.current) {
    const audio = new Audio("/sounds/EM_FIRE_IMPACT_01.ogg");
    audio.loop = false;
    audio.volume = 1.0;
    fireImpactAudio.current = audio;
  }
  const lightImpactAudio = useRef<HTMLAudioElement | null>(null);
  if (!lightImpactAudio.current) {
    const audio = new Audio("/sounds/EM_LIGHT_IMPACT_01.ogg");
    audio.loop = false;
    audio.volume = 1.0;
    lightImpactAudio.current = audio;
  }
  const fireLaunchAudio = useRef<HTMLAudioElement | null>(null);
  if (!fireLaunchAudio.current) {
    const audio = new Audio("/sounds/EM_FIRE_LAUNCH_01.ogg");
    audio.loop = false;
    audio.volume = 1.0;
    fireLaunchAudio.current = audio;
  }
  const lightLaunchAudio = useRef<HTMLAudioElement | null>(null);
  if (!lightLaunchAudio.current) {
    const audio = new Audio("/sounds/EM_LIGHT_LAUNCH_01.ogg");
    audio.loop = false;
    audio.volume = 1.0;
    lightLaunchAudio.current = audio;
  }
  const beamClashAudio = useRef<HTMLAudioElement | null>(null);
  if (!beamClashAudio.current) {
    const audio = new Audio(
      "/sounds/dragon-studio-epic-spell-impact-478364.mp3",
    );
    audio.loop = false;
    audio.volume = 1.0;
    beamClashAudio.current = audio;
  }

  // ── Red laser animation state ──

  const redLaserFrameIndex = useRef(0);
  const redLaserAnimTimer = useRef(0);
  const redLaserInLoopPhase = useRef(false);

  // ── Blue laser animation state ──

  const blueLaserFrameIndex = useRef(0);
  const blueLaserAnimTimer = useRef(0);
  const blueLaserInLoopPhase = useRef(false);

  // ── CPU state ──

  const cpuState = useRef(createCpuState());
  const previousRegenGateCount = useRef(0);
  const cpuTurnTakenThisLap = useRef(false);

  const resetAllTransientState = () => {
    isResultTextVisible.current = false;
    resultTextOpacity.current = 0;
    countdownLabel.current = null;
    ringContainerOpacity.current = 0;
    sparkParticles.current = [];
    cpuState.current = createCpuState();
    previousRegenGateCount.current = 0;
    cpuTurnTakenThisLap.current = false;
    hasAttackIntroCompleted.current = false;
    explosionParticles.current = [];
    dialGame.start();
    dialGame.stop();
    if (refs.ringContainer.current) {
      refs.ringContainer.current.visible = false;
      refs.ringContainer.current.alpha = 0;
    }
    currentPhase.current = "intro";
    resetAnimationFrameCounters();
  };

  const executeCpuTurn = (): number => {
    if (useGameStore.getState().phase === "ended") return 0;
    cpuTurnTakenThisLap.current = true;
    const difficulty = useGameStore.getState().difficulty;
    const { result, next } = cpuTakeTurn(cpuState.current, difficulty);
    cpuState.current = next;
    return result.hit ? result.points : 0;
  };

  const resolveRoundOutcome = (playerPoints: number, cpuPoints: number) => {
    const pointDelta = playerPoints - cpuPoints;
    useGameStore.getState().resolveRound(playerPoints, cpuPoints);

    const { sfxEnabled, muted } = useGameStore.getState();
    const canPlaySfx = sfxEnabled && !muted;
    if (canPlaySfx && pointDelta > 0 && fireImpactAudio.current) {
      fireImpactAudio.current.currentTime = 0;
      fireImpactAudio.current.play().catch(() => {});
    } else if (canPlaySfx && pointDelta < 0 && lightImpactAudio.current) {
      lightImpactAudio.current.currentTime = 0;
      lightImpactAudio.current.play().catch(() => {});
    }

    const storePhase = useGameStore.getState().phase;
    if (
      storePhase === "ended" &&
      currentPhase.current !== "player_lose" &&
      currentPhase.current !== "player_win"
    ) {
      const playerWon = useGameStore.getState().score > 0;
      if (playerWon) {
        resultTextContent.current = copies.game.result.youWin;
        currentPhase.current = "player_win";
        resetAnimationFrameCounters();
        dialGame.stop();
        triggerScreenShake();
        spawnExplosion(
          explosionParticles.current,
          opponentPositionX.current + layout.characters.charSize * 0.5,
          layout.positions.groundY + layout.characters.charSize * 0.4,
        );
        if (canPlaySfx && fireLaunchAudio.current) {
          fireLaunchAudio.current.currentTime = 0;
          fireLaunchAudio.current.play().catch(() => {});
        }
      } else {
        resultTextContent.current = copies.game.result.youLose;
        currentPhase.current = "player_lose";
        resetAnimationFrameCounters();
        dialGame.stop();
        triggerScreenShake();
        spawnExplosion(
          explosionParticles.current,
          playerPositionX.current + layout.characters.charSize * 0.5,
          layout.positions.groundY + layout.characters.charSize * 0.4,
        );
        if (canPlaySfx && lightLaunchAudio.current) {
          lightLaunchAudio.current.currentTime = 0;
          lightLaunchAudio.current.play().catch(() => {});
        }
      }
      return;
    }

    if (pointDelta > 0) {
      triggerScreenShake();
    } else if (pointDelta < 0) {
      triggerScreenShake();
    } else {
      triggerScreenShake();
      const clashX =
        (laserClashPointLerpedX.current ?? layout.positions.meetX) -
        layout.characters.charSize * 0.3;
      const clashY =
        layout.positions.groundY + layout.characters.charSize * 0.66;
      spawnSparks(sparkParticles.current, clashX, clashY);
      if (beamClashAudio.current) {
        beamClashAudio.current.currentTime = 0;
        if (canPlaySfx) beamClashAudio.current.play().catch(() => {});
      }
    }
  };

  // ── Attach particle graphics layers to container ──

  useEffect(() => {
    const container = refs.container.current;
    if (!container) return;

    const sparkLayer = new Graphics();
    const explosionLayer = new Graphics();
    sparkGraphicsLayer.current = sparkLayer;
    explosionGraphicsLayer.current = explosionLayer;
    container.addChild(sparkLayer);
    container.addChild(explosionLayer);

    return () => {
      container.removeChild(sparkLayer);
      container.removeChild(explosionLayer);
      sparkLayer.destroy();
      explosionLayer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Input listener for dial game (Space / click / tap) ──

  useEffect(() => {
    const inputAllowedPhases: Phase[] = ["idle"];

    const handleInput = (event?: KeyboardEvent) => {
      if (event && event.key !== " ") return;
      if (event) event.preventDefault();

      if (!inputAllowedPhases.includes(currentPhase.current)) return;
      if (!dialGame.active.current) return;

      const hitResult = dialGame.attempt();
      if (hitResult === null) return;

      const cpuPoints = executeCpuTurn();
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

  // -- Debug key listener (1 -> score -6, 2 -> -5, 3 -> 5, 4 -> 6) --

  useEffect(() => {
    const DEBUG_SCORE_MAP: Record<string, number> = {
      "1": -9,
      "2": -8,
      "3": 9,
      "4": 8,
    };

    const onDebugKey = (event: KeyboardEvent) => {
      const targetScore = DEBUG_SCORE_MAP[event.key];
      if (
        targetScore !== undefined &&
        useGameStore.getState().phase === "playing"
      ) {
        useGameStore.getState().debugSetScore(targetScore);
      }
    };

    window.addEventListener("keydown", onDebugKey);
    return () => {
      window.removeEventListener("keydown", onDebugKey);
    };
  }, []);
  const resetAnimationFrameCounters = () => {
    playerAnimFrameIndex.current = 0;
    opponentAnimFrameIndex.current = 0;
    playerAnimTimer.current = 0;
    opponentAnimTimer.current = 0;
    isPhaseAnimationComplete.current = false;
  };

  const triggerScreenShake = () => {
    screenShakeTimeRemaining.current = SHAKE_DURATION;
    isScreenShaking.current = true;
  };

  // ── Main tick ──

  useTick((ticker) => {
    const { container, bg, player, opponent } = refs;
    if (
      !player.current ||
      !opponent.current ||
      !container.current ||
      !bg.current
    )
      return;
    if (!playerAnims || !opponentAnims) return;

    if (bgTexture !== Texture.EMPTY) {
      const screenWidth = layout.base.width;
      const screenHeight = layout.base.height;
      const bgCoverScale = Math.max(
        screenWidth / bgTexture.width,
        screenHeight / bgTexture.height,
      );
      bg.current.scale.set(bgCoverScale);
      bg.current.x = (screenWidth - bgTexture.width * bgCoverScale) / 2;
      bg.current.y = (screenHeight - bgTexture.height * bgCoverScale) / 2;
    }

    const deltaSeconds = ticker.deltaTime / 60;
    const activePhase = currentPhase.current;

    // ── Sprite animation stepping ──

    const playerAnimName = getAnimName("player", activePhase);
    const opponentAnimName = getAnimName("opponent", activePhase);
    const playerAnimFrames = playerAnims[playerAnimName];
    const opponentAnimFrames = opponentAnims[opponentAnimName];

    if (
      activePhase !== "player_win" &&
      activePhase !== "player_lose" &&
      activePhase !== "attack_intro"
    ) {
      if (hasAttackIntroCompleted.current && playerAnimName === "Idle") {
        const playerAttackFrames = playerAnims["Flame_jet"];
        player.current.texture =
          playerAttackFrames[playerAttackFrames.length - 1];
      } else {
        playerAnimTimer.current += deltaSeconds;
        if (playerAnimTimer.current >= ANIM_SPEED) {
          playerAnimTimer.current = 0;
          playerAnimFrameIndex.current =
            (playerAnimFrameIndex.current + 1) % playerAnimFrames.length;
          player.current.texture =
            playerAnimFrames[playerAnimFrameIndex.current];
        }
      }

      if (hasAttackIntroCompleted.current && opponentAnimName === "Idle") {
        const opponentAttackFrames = opponentAnims["Magic_arrow"];
        opponent.current.texture =
          opponentAttackFrames[opponentAttackFrames.length - 1];
      } else {
        opponentAnimTimer.current += deltaSeconds;
        if (opponentAnimTimer.current >= ANIM_SPEED) {
          opponentAnimTimer.current = 0;
          opponentAnimFrameIndex.current =
            (opponentAnimFrameIndex.current + 1) % opponentAnimFrames.length;
          opponent.current.texture =
            opponentAnimFrames[opponentAnimFrameIndex.current];
        }
      }
    }
    switch (activePhase) {
      case "intro": {
        if (useGameStore.getState().phase === "playing") {
          if (refs.ringContainer.current) {
            refs.ringContainer.current.visible = true;
            refs.ringContainer.current.alpha = 0;
          }
          ringContainerOpacity.current = 0;
          currentPhase.current = "countdown";
          countdownLabel.current = copies.game.countdown.three;
          resetAnimationFrameCounters();
          const countdownStepMs = COUNTDOWN_STEP_MS;
          setTimeout(() => {
            countdownLabel.current = copies.game.countdown.two;
          }, countdownStepMs);
          setTimeout(() => {
            countdownLabel.current = copies.game.countdown.one;
          }, countdownStepMs * 2);
          setTimeout(() => {
            countdownLabel.current = copies.game.countdown.fight;
          }, countdownStepMs * 3);
          setTimeout(
            () => {
              countdownLabel.current = null;
              currentPhase.current = "attack_intro";
              resetAnimationFrameCounters();
              dialGame.start();
            },
            countdownStepMs * 3 + COUNTDOWN_FIGHT_MS,
          );
        }
        break;
      }

      case "countdown": {
        if (ringContainerOpacity.current < 1) {
          ringContainerOpacity.current = Math.min(
            1,
            ringContainerOpacity.current + deltaSeconds / RING_FADE_IN_DURATION,
          );
          if (refs.ringContainer.current) {
            refs.ringContainer.current.alpha = ringContainerOpacity.current;
          }
        }
        break;
      }

      case "attack_intro": {
        const playerAttackFrames = playerAnims["Flame_jet"];
        const opponentAttackFrames = opponentAnims["Magic_arrow"];

        player.current.texture =
          playerAttackFrames[playerAnimFrameIndex.current];
        opponent.current.texture =
          opponentAttackFrames[opponentAnimFrameIndex.current];

        playerAnimTimer.current += deltaSeconds;
        if (playerAnimTimer.current >= ANIM_SPEED) {
          playerAnimTimer.current = 0;
          if (playerAnimFrameIndex.current < playerAttackFrames.length - 1)
            playerAnimFrameIndex.current++;
        }

        opponentAnimTimer.current += deltaSeconds;
        if (opponentAnimTimer.current >= ANIM_SPEED) {
          opponentAnimTimer.current = 0;
          if (opponentAnimFrameIndex.current < opponentAttackFrames.length - 1)
            opponentAnimFrameIndex.current++;
        }

        if (
          playerAnimFrameIndex.current >= playerAttackFrames.length - 1 &&
          opponentAnimFrameIndex.current >= opponentAttackFrames.length - 1 &&
          !isPhaseAnimationComplete.current
        ) {
          isPhaseAnimationComplete.current = true;
          hasAttackIntroCompleted.current = true;
          currentPhase.current = "idle";
          resetAnimationFrameCounters();
        }
        break;
      }

      case "fight_text":
      case "idle": {
        break;
      }

      case "player_win": {
        const storePhase = useGameStore.getState().phase;
        if (storePhase !== "ended") {
          resetAllTransientState();
          break;
        }

        if (ringContainerOpacity.current > 0) {
          ringContainerOpacity.current = Math.max(
            0,
            ringContainerOpacity.current - deltaSeconds / RING_FADE_IN_DURATION,
          );
          if (refs.ringContainer.current) {
            refs.ringContainer.current.alpha = ringContainerOpacity.current;
            if (ringContainerOpacity.current <= 0)
              refs.ringContainer.current.visible = false;
          }
        }

        opponentAnimTimer.current += deltaSeconds;
        if (opponentAnimTimer.current >= SLOWMO_ANIM_SPEED) {
          opponentAnimTimer.current = 0;
          if (opponentAnimFrameIndex.current < opponentAnimFrames.length - 1) {
            opponentAnimFrameIndex.current++;
            opponent.current.texture =
              opponentAnimFrames[opponentAnimFrameIndex.current];
          } else if (!isPhaseAnimationComplete.current) {
            isPhaseAnimationComplete.current = true;
            isResultTextVisible.current = true;
          }
        }

        {
          const playerIdleFrames = playerAnims["Idle"];
          playerAnimTimer.current += deltaSeconds;
          if (playerAnimTimer.current >= ANIM_SPEED) {
            playerAnimTimer.current = 0;
            playerAnimFrameIndex.current =
              (playerAnimFrameIndex.current + 1) % playerIdleFrames.length;
            player.current.texture =
              playerIdleFrames[playerAnimFrameIndex.current];
          }
        }

        if (isResultTextVisible.current && resultTextOpacity.current < 1) {
          resultTextOpacity.current = Math.min(
            1,
            resultTextOpacity.current + deltaSeconds / WIN_TEXT_FADE_DURATION,
          );
        }
        break;
      }

      case "player_lose": {
        const storePhase = useGameStore.getState().phase;
        if (storePhase !== "ended") {
          resetAllTransientState();
          break;
        }

        if (ringContainerOpacity.current > 0) {
          ringContainerOpacity.current = Math.max(
            0,
            ringContainerOpacity.current - deltaSeconds / RING_FADE_IN_DURATION,
          );
          if (refs.ringContainer.current) {
            refs.ringContainer.current.alpha = ringContainerOpacity.current;
            if (ringContainerOpacity.current <= 0)
              refs.ringContainer.current.visible = false;
          }
        }

        playerAnimTimer.current += deltaSeconds;
        if (playerAnimTimer.current >= SLOWMO_ANIM_SPEED) {
          playerAnimTimer.current = 0;
          if (playerAnimFrameIndex.current < playerAnimFrames.length - 1) {
            playerAnimFrameIndex.current++;
            player.current.texture =
              playerAnimFrames[playerAnimFrameIndex.current];
          } else if (!isPhaseAnimationComplete.current) {
            isPhaseAnimationComplete.current = true;
            isResultTextVisible.current = true;
          }
        }

        {
          const opponentIdleFrames = opponentAnims["Idle"];
          opponentAnimTimer.current += deltaSeconds;
          if (opponentAnimTimer.current >= ANIM_SPEED) {
            opponentAnimTimer.current = 0;
            opponentAnimFrameIndex.current =
              (opponentAnimFrameIndex.current + 1) % opponentIdleFrames.length;
            opponent.current.texture =
              opponentIdleFrames[opponentAnimFrameIndex.current];
          }
        }

        if (isResultTextVisible.current && resultTextOpacity.current < 1) {
          resultTextOpacity.current = Math.min(
            1,
            resultTextOpacity.current + deltaSeconds / WIN_TEXT_FADE_DURATION,
          );
        }
        break;
      }
    }

    // ── CPU turn on block regeneration gate ──
    const currentRegenGateCount = dialGame.regenCount.current;
    if (currentRegenGateCount > previousRegenGateCount.current) {
      const isVeryFirstGate = previousRegenGateCount.current === 0;
      previousRegenGateCount.current = currentRegenGateCount;
      if (
        !isVeryFirstGate &&
        !cpuTurnTakenThisLap.current &&
        currentPhase.current !== "attack_intro"
      ) {
        const cpuPoints = executeCpuTurn();
        resolveRoundOutcome(0, cpuPoints);
      }
      cpuTurnTakenThisLap.current = false;
    }

    // ── Sync character positions from layout (reactive to resize) ──

    playerPositionX.current = layout.positions.charStartX;
    opponentPositionX.current = layout.positions.charEndX;

    player.current.x = playerPositionX.current;
    player.current.y = layout.positions.groundY;
    player.current.scale.set(layout.characters.charScale);
    player.current.scale.x = layout.characters.charScale;
    player.current.anchor.x = 0;

    opponent.current.x = opponentPositionX.current;
    opponent.current.y = layout.positions.groundY;
    opponent.current.scale.set(layout.characters.charScale);
    opponent.current.scale.x = -layout.characters.charScale;
    opponent.current.anchor.x = 1;

    if (refs.ringContainer.current) {
      refs.ringContainer.current.x = layout.positions.meetX;
      refs.ringContainer.current.y = layout.positions.meetY;
    }

    // ── Red laser beam (player → right) ──

    const redLaserSource = refs.laserSource.current;
    const redLaserMiddleContainer = refs.laserMiddle.current;
    const redLaserImpact = refs.laserImpact.current;

    if (
      redLaserSource &&
      redLaserMiddleContainer &&
      redLaserImpact &&
      laserFrames
    ) {
      const shouldShowRedLaser =
        hasAttackIntroCompleted.current &&
        activePhase !== "intro" &&
        activePhase !== "attack_intro" &&
        activePhase !== "player_win" &&
        activePhase !== "player_lose";

      if (shouldShowRedLaser) {
        redLaserSource.visible = true;
        redLaserMiddleContainer.visible = true;
        redLaserImpact.visible = true;

        if (!isBeamAudioPlaying.current) {
          const { sfxEnabled, muted } = useGameStore.getState();
          const canPlaySfx = sfxEnabled && !muted;
          if (canPlaySfx && fireBeamLoopAudio.current) {
            fireBeamLoopAudio.current.currentTime = 0;
            fireBeamLoopAudio.current.play().catch(() => {});
          }
          if (canPlaySfx && lightBeamLoopAudio.current) {
            lightBeamLoopAudio.current.currentTime = 0;
            lightBeamLoopAudio.current.play().catch(() => {});
          }
          if (canPlaySfx && lightCastOneShotAudio.current) {
            lightCastOneShotAudio.current.currentTime = 0;
            lightCastOneShotAudio.current.play().catch(() => {});
          }
          if (canPlaySfx && fireCastOneShotAudio.current) {
            fireCastOneShotAudio.current.currentTime = 0;
            fireCastOneShotAudio.current.play().catch(() => {});
          }
          isBeamAudioPlaying.current = true;
        }

        if (isBeamAudioPlaying.current) {
          const { sfxEnabled, muted } = useGameStore.getState();
          const shouldPlayAudio = sfxEnabled && !muted;
          if (!shouldPlayAudio) {
            if (fireBeamLoopAudio.current && !fireBeamLoopAudio.current.paused)
              fireBeamLoopAudio.current.pause();
            if (
              lightBeamLoopAudio.current &&
              !lightBeamLoopAudio.current.paused
            )
              lightBeamLoopAudio.current.pause();
          } else {
            if (fireBeamLoopAudio.current && fireBeamLoopAudio.current.paused)
              fireBeamLoopAudio.current.play().catch(() => {});
            if (lightBeamLoopAudio.current && lightBeamLoopAudio.current.paused)
              lightBeamLoopAudio.current.play().catch(() => {});
          }
        }

        // Advance red laser animation at 24 fps
        redLaserAnimTimer.current += deltaSeconds;
        if (redLaserAnimTimer.current >= LASER_ANIM_SPEED) {
          redLaserAnimTimer.current = 0;
          if (!redLaserInLoopPhase.current) {
            redLaserFrameIndex.current++;
            if (redLaserFrameIndex.current >= 4) {
              redLaserInLoopPhase.current = true;
              redLaserFrameIndex.current = 0;
            }
          } else {
            redLaserFrameIndex.current = (redLaserFrameIndex.current + 1) % 4;
          }
        }

        const redFrameIdx = redLaserFrameIndex.current;
        const redMiddleTexture = !redLaserInLoopPhase.current
          ? laserFrames.middleStart[redFrameIdx]
          : laserFrames.middleLoop[redFrameIdx];

        if (!redLaserInLoopPhase.current) {
          redLaserSource.texture = laserFrames.sourceStart[redFrameIdx];
          redLaserImpact.texture = laserFrames.impactStart[redFrameIdx];
        } else {
          redLaserSource.texture = laserFrames.sourceLoop[redFrameIdx];
          redLaserImpact.texture = laserFrames.impactLoop[redFrameIdx];
        }

        const charSize = layout.characters.charSize;
        const laserSpriteFrameWidth = laserFrames.sourceStart[0].width;
        const laserSpriteFrameHeight = laserFrames.sourceStart[0].height;
        const beamVisualHeight = charSize * 0.75;
        const beamScale = beamVisualHeight / laserSpriteFrameHeight;
        const scaledTileWidth = laserSpriteFrameWidth * beamScale;
        const beamVerticalCenter = layout.positions.groundY + charSize * 0.66;

        // Source: at the fire mage's hands
        const redSourceX = playerPositionX.current + charSize * 0.15;
        redLaserSource.x = redSourceX;
        redLaserSource.y = beamVerticalCenter;
        redLaserSource.anchor.set(0, 0.5);
        redLaserSource.scale.set(beamScale, beamScale);

        // Impact position shifts based on score (smoothly lerped)
        const isSmallScreen = layout.base.unit < 500;
        const scoreNormalized = Math.min(
          1,
          Math.max(-1, useGameStore.getState().score / (WIN_POINTS + 1)),
        );
        const scoreBarBaseWidth = layout.ring.outerRadius * 2;
        const scoreBarWidthMultiplier = Math.min(
          2.2,
          Math.max(1, layout.base.width / 800),
        );
        const scoreBarHalfWidth =
          (scoreBarBaseWidth * scoreBarWidthMultiplier) / 2;
        const redImpactBaseX =
          layout.positions.meetX + charSize * (isSmallScreen ? 0.2 : 0.3);
        const impactTravelMultiplier = isSmallScreen ? 0.8 : 1.5;
        const redImpactTargetX =
          redImpactBaseX +
          scoreBarHalfWidth * scoreNormalized * impactTravelMultiplier;

        if (laserClashPointLerpedX.current === null) {
          laserClashPointLerpedX.current = redImpactTargetX;
        } else {
          laserClashPointLerpedX.current +=
            (redImpactTargetX - laserClashPointLerpedX.current) * 0.06;
        }
        // Clamp: red laser minimum length (can't shrink past 1.2 tiles from source)
        const redLaserMinimumEndX = redSourceX + scaledTileWidth * 1.2;
        // Clamp: red laser must not extend past the blue laser's minimum end position
        const blueSourceXForClamp = opponentPositionX.current + charSize * 0.65;
        const blueLaserMinEndForRedClamp =
          blueSourceXForClamp - scaledTileWidth * 0.5;
        const redImpactLerpedX = Math.min(
          blueLaserMinEndForRedClamp,
          Math.max(laserClashPointLerpedX.current, redLaserMinimumEndX),
        );
        redImpactClampedX.current = redImpactLerpedX;

        redLaserImpact.x = redImpactLerpedX;
        redLaserImpact.y = beamVerticalCenter;
        redLaserImpact.anchor.set(1, 0.5);
        redLaserImpact.scale.set(beamScale, beamScale);

        // Tiled middle: fill gap between source and impact with overlapping tiles
        const redMiddleTileStartX = redSourceX + scaledTileWidth * 0.3;
        const redMiddleTileEndX = redImpactLerpedX - scaledTileWidth;
        const redMiddleTotalSpan = redMiddleTileEndX - redMiddleTileStartX;

        if (redMiddleTotalSpan <= 0) {
          redLaserMiddleContainer.visible = false;
          while (redLaserMiddleContainer.children.length > 0) {
            const removed = redLaserMiddleContainer.removeChildAt(
              redLaserMiddleContainer.children.length - 1,
            );
            removed.destroy();
          }
        } else {
          redLaserMiddleContainer.visible = true;
          const tileOverlapStep = scaledTileWidth * 0.3;
          const redMiddleTileCount = Math.max(
            1,
            Math.ceil(redMiddleTotalSpan / tileOverlapStep),
          );

          while (redLaserMiddleContainer.children.length < redMiddleTileCount) {
            const tileSprite = new Sprite();
            tileSprite.anchor.set(0, 0.5);
            redLaserMiddleContainer.addChild(tileSprite);
          }
          while (redLaserMiddleContainer.children.length > redMiddleTileCount) {
            const removed = redLaserMiddleContainer.removeChildAt(
              redLaserMiddleContainer.children.length - 1,
            );
            removed.destroy();
          }

          for (let i = 0; i < redMiddleTileCount; i++) {
            const tileSprite = redLaserMiddleContainer.children[i] as Sprite;
            tileSprite.texture = redMiddleTexture;
            tileSprite.x = redMiddleTileStartX + i * tileOverlapStep;
            tileSprite.y = beamVerticalCenter;
            tileSprite.scale.set(beamScale, beamScale);
          }
        }
        redLaserMiddleContainer.zIndex = 0;
        redLaserSource.zIndex = 1;
        redLaserImpact.zIndex = 1;
      } else {
        redLaserSource.visible = false;
        redLaserMiddleContainer.visible = false;
        redLaserImpact.visible = false;
        redLaserFrameIndex.current = 0;
        redLaserAnimTimer.current = 0;
        redLaserInLoopPhase.current = false;
        laserClashPointLerpedX.current = null;

        if (isBeamAudioPlaying.current) {
          if (fireBeamLoopAudio.current) fireBeamLoopAudio.current.pause();
          if (lightBeamLoopAudio.current) lightBeamLoopAudio.current.pause();
          isBeamAudioPlaying.current = false;
        }
      }
    }

    // ── Blue laser beam (opponent → left) ──

    const blueLaserSource = refs.blueLaserSource.current;
    const blueLaserMiddleContainer = refs.blueLaserMiddle.current;
    const blueLaserImpact = refs.blueLaserImpact.current;

    if (
      blueLaserSource &&
      blueLaserMiddleContainer &&
      blueLaserImpact &&
      blueLaserFrames
    ) {
      const shouldShowBlueLaser =
        hasAttackIntroCompleted.current &&
        activePhase !== "intro" &&
        activePhase !== "attack_intro" &&
        activePhase !== "player_win" &&
        activePhase !== "player_lose";

      if (shouldShowBlueLaser) {
        blueLaserSource.visible = true;
        blueLaserMiddleContainer.visible = true;
        blueLaserImpact.visible = true;

        // Advance blue laser animation at 24 fps
        blueLaserAnimTimer.current += deltaSeconds;
        if (blueLaserAnimTimer.current >= LASER_ANIM_SPEED) {
          blueLaserAnimTimer.current = 0;
          if (!blueLaserInLoopPhase.current) {
            blueLaserFrameIndex.current++;
            if (blueLaserFrameIndex.current >= 4) {
              blueLaserInLoopPhase.current = true;
              blueLaserFrameIndex.current = 0;
            }
          } else {
            blueLaserFrameIndex.current = (blueLaserFrameIndex.current + 1) % 4;
          }
        }

        const blueFrameIdx = blueLaserFrameIndex.current;
        const blueMiddleTexture = !blueLaserInLoopPhase.current
          ? blueLaserFrames.middleStart[blueFrameIdx]
          : blueLaserFrames.middleLoop[blueFrameIdx];

        if (!blueLaserInLoopPhase.current) {
          blueLaserSource.texture = blueLaserFrames.sourceStart[blueFrameIdx];
          blueLaserImpact.texture = blueLaserFrames.impactStart[blueFrameIdx];
        } else {
          blueLaserSource.texture = blueLaserFrames.sourceLoop[blueFrameIdx];
          blueLaserImpact.texture = blueLaserFrames.impactLoop[blueFrameIdx];
        }

        const charSize = layout.characters.charSize;
        const blueFrameWidth = blueLaserFrames.sourceStart[0].width;
        const blueFrameHeight = blueLaserFrames.sourceStart[0].height;
        const blueBeamVisualHeight = charSize * 0.75;
        const blueBeamScale = blueBeamVisualHeight / blueFrameHeight;
        const blueScaledTileWidth = blueFrameWidth * blueBeamScale;
        const blueBeamVerticalCenter =
          layout.positions.groundY + charSize * 0.66;

        // Source: at the wanderer mage's hands (mirrored — facing left)
        const blueSourceX = opponentPositionX.current + charSize * 0.65;
        blueLaserSource.x = blueSourceX;
        blueLaserSource.y = blueBeamVerticalCenter;
        blueLaserSource.anchor.set(0, 0.5);
        blueLaserSource.scale.set(-blueBeamScale, blueBeamScale);

        // Impact position derived from the red laser's clamped impact X
        const blueIsSmallScreen = layout.base.unit < 500;
        const blueImpactBaseX =
          layout.positions.meetX - charSize * (blueIsSmallScreen ? 0.31 : 0.21);

        const redLaserBaseImpactX =
          layout.positions.meetX + charSize * (blueIsSmallScreen ? 0.2 : 0.3);
        // Use the clamped red impact X so the blue laser respects the red's minimum length
        const effectiveRedImpactX =
          redImpactClampedX.current ??
          laserClashPointLerpedX.current ??
          layout.positions.meetX;
        const lerpedShiftFromCenter = effectiveRedImpactX - redLaserBaseImpactX;
        const blueImpactUnclampedX = blueImpactBaseX + lerpedShiftFromCenter;
        // Clamp: blue laser must maintain minimum length of 1.2 tiles from its source (same as red)
        // Blue goes right-to-left, so its impact X must not exceed this value (prevents shrinkage)
        const blueLaserMinimumEndX = blueSourceX - blueScaledTileWidth * 1.2;
        const blueImpactLerpedX = Math.min(
          blueImpactUnclampedX,
          blueLaserMinimumEndX,
        );

        blueLaserImpact.x = blueImpactLerpedX;
        blueLaserImpact.y = blueBeamVerticalCenter;
        blueLaserImpact.anchor.set(1, 0.5);
        blueLaserImpact.scale.set(-blueBeamScale, blueBeamScale);

        // Tiled middle: fill gap going right-to-left (mirrored)
        const blueMiddleTileStartX = blueSourceX - blueScaledTileWidth * 0.3;
        const blueMiddleTileEndX = blueImpactLerpedX + blueScaledTileWidth;
        const blueMiddleTotalSpan = blueMiddleTileStartX - blueMiddleTileEndX;

        if (blueMiddleTotalSpan <= 0) {
          blueLaserMiddleContainer.visible = false;
          while (blueLaserMiddleContainer.children.length > 0) {
            const removed = blueLaserMiddleContainer.removeChildAt(
              blueLaserMiddleContainer.children.length - 1,
            );
            removed.destroy();
          }
        } else {
          blueLaserMiddleContainer.visible = true;
          const blueTileOverlapStep = blueScaledTileWidth * 0.3;
          const blueMiddleTileCount = Math.max(
            1,
            Math.ceil(blueMiddleTotalSpan / blueTileOverlapStep),
          );

          while (
            blueLaserMiddleContainer.children.length < blueMiddleTileCount
          ) {
            const tileSprite = new Sprite();
            tileSprite.anchor.set(0, 0.5);
            blueLaserMiddleContainer.addChild(tileSprite);
          }
          while (
            blueLaserMiddleContainer.children.length > blueMiddleTileCount
          ) {
            const removed = blueLaserMiddleContainer.removeChildAt(
              blueLaserMiddleContainer.children.length - 1,
            );
            removed.destroy();
          }

          for (let i = 0; i < blueMiddleTileCount; i++) {
            const tileSprite = blueLaserMiddleContainer.children[i] as Sprite;
            tileSprite.texture = blueMiddleTexture;
            tileSprite.x = blueMiddleTileStartX - i * blueTileOverlapStep;
            tileSprite.y = blueBeamVerticalCenter;
            tileSprite.scale.set(-blueBeamScale, blueBeamScale);
          }
        }
        blueLaserMiddleContainer.zIndex = 0;
        blueLaserSource.zIndex = 1;
        blueLaserImpact.zIndex = 1;
      } else {
        blueLaserSource.visible = false;
        blueLaserMiddleContainer.visible = false;
        blueLaserImpact.visible = false;
        blueLaserFrameIndex.current = 0;
        blueLaserAnimTimer.current = 0;
        blueLaserInLoopPhase.current = false;
      }
    }

    // ── Screen shake ──

    if (isScreenShaking.current) {
      screenShakeTimeRemaining.current -= deltaSeconds;
      if (screenShakeTimeRemaining.current <= 0) {
        isScreenShaking.current = false;
        container.current.x = 0;
        container.current.y = 0;
      } else {
        const shakeProgress = screenShakeTimeRemaining.current / SHAKE_DURATION;
        const shakeIntensity = layout.movement.shakeIntensity * shakeProgress;
        container.current.x = (Math.random() - 0.5) * 2 * shakeIntensity;
        container.current.y = (Math.random() - 0.5) * 2 * shakeIntensity;
      }
    }

    // ── Spark particles ──

    const sparkLayer = sparkGraphicsLayer.current;
    if (sparkLayer) {
      sparkParticles.current = updateSparkParticles(
        sparkLayer,
        sparkParticles.current,
        deltaSeconds,
      );
    }

    // ── Explosion particles ──

    const explosionLayer = explosionGraphicsLayer.current;
    if (explosionLayer) {
      explosionParticles.current = updateExplosionParticles(
        explosionLayer,
        explosionParticles.current,
        deltaSeconds,
      );
    }
  });

  return {
    showWinText: isResultTextVisible,
    winTextAlpha: resultTextOpacity,
    winnerText: resultTextContent,
    countdownText: countdownLabel,
  };
}
