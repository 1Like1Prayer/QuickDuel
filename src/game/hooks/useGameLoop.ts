import { useTick } from "@pixi/react";
import { Graphics, Texture } from "pixi.js";
import { useEffect, useRef } from "react";

import {
  ANIM_SPEED,
  COUNTDOWN_FIGHT_MS,
  COUNTDOWN_STEP_MS,
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
import {
  type BeamState,
  createBeamState,
  resetBeamState,
  drawBeam,
  RED_BEAM_CONFIG,
  BLUE_BEAM_CONFIG,
} from "../utils/beamRenderer";

export function useGameLoop({
  app,
  refs,
  bgTexture,
  playerAnims,
  opponentAnims,
  dialGame,
  layout,
}: GameLoopParams) {
  const sparkGfx = useRef<Graphics | null>(null);
  const explosionGfx = useRef<Graphics | null>(null);

  // Win/Lose text state (read by Scene for rendering)
  const showWinText = useRef(false);
  const winTextAlpha = useRef(0);
  const winnerText = useRef("You Win");

  // Countdown state (read by Scene for rendering)
  const countdownText = useRef<string | null>(null);  // "3", "2", "1", "FIGHT!" or null
  const ringAlpha = useRef(0);                        // fade-in alpha for the ring container
  const laserImpactLerpX = useRef<number | null>(null); // lerped laser clash X position

  // Phase state machine
  const phase = useRef<Phase>("intro");

  // Place characters at the screen edges
  const playerFightX = layout.positions.charStartX;
  const opponentFightX = layout.positions.charEndX;

  const playerX = useRef(playerFightX);
  const opponentX = useRef(opponentFightX);

  const playerFrame = useRef(0);
  const opponentFrame = useRef(0);
  const playerElapsed = useRef(0);
  const opponentElapsed = useRef(0);
  const phaseAnimDone = useRef(false);

  // Whether the initial attack-intro animation has played (after which we loop last 2 frames)
  const attackIntroPlayed = useRef(false);

  const shakeTimer = useRef(0);
  const isShaking = useRef(false);

  const sparkParticles = useRef<SparkParticle[]>([]);
  const explosionParticles = useRef<ExplosionParticle[]>([]);

  // Laser hold SFX
  const fireHoldSfx = useRef<HTMLAudioElement | null>(null);
  if (!fireHoldSfx.current) {
    const sfx = new Audio("/SFX/EM_FIRE_HOLD_4s.ogg");
    sfx.loop = true;
    sfx.volume = 0.8;
    fireHoldSfx.current = sfx;
  }
  const lightHoldSfx = useRef<HTMLAudioElement | null>(null);
  if (!lightHoldSfx.current) {
    const sfx = new Audio("/SFX/EM_LIGHT_HOLD_5s.ogg");
    sfx.loop = true;
    sfx.volume = 0.8;
    lightHoldSfx.current = sfx;
  }
  const laserCastSfx = useRef<HTMLAudioElement | null>(null);
  if (!laserCastSfx.current) {
    const sfx = new Audio("/SFX/EM_LIGHT_CAST_02_S.ogg");
    sfx.loop = false;
    sfx.volume = 0.8;
    laserCastSfx.current = sfx;
  }
  const fireCastSfx = useRef<HTMLAudioElement | null>(null);
  if (!fireCastSfx.current) {
    const sfx = new Audio("/SFX/EM_FIRE_CAST_02.ogg");
    sfx.loop = false;
    sfx.volume = 0.8;
    fireCastSfx.current = sfx;
  }
  const laserSfxPlaying = useRef(false);

  // Impact SFX
  const fireImpactSfx = useRef<HTMLAudioElement | null>(null);
  if (!fireImpactSfx.current) {
    const sfx = new Audio("/SFX/EM_FIRE_IMPACT_01.ogg");
    sfx.loop = false;
    sfx.volume = 1.0;
    fireImpactSfx.current = sfx;
  }
  const lightImpactSfx = useRef<HTMLAudioElement | null>(null);
  if (!lightImpactSfx.current) {
    const sfx = new Audio("/SFX/EM_LIGHT_IMPACT_01.ogg");
    sfx.loop = false;
    sfx.volume = 1.0;
    lightImpactSfx.current = sfx;
  }
  const fireLaunchSfx = useRef<HTMLAudioElement | null>(null);
  if (!fireLaunchSfx.current) {
    const sfx = new Audio("/SFX/EM_FIRE_LAUNCH_01.ogg");
    sfx.loop = false;
    sfx.volume = 1.0;
    fireLaunchSfx.current = sfx;
  }
  const lightLaunchSfx = useRef<HTMLAudioElement | null>(null);
  if (!lightLaunchSfx.current) {
    const sfx = new Audio("/SFX/EM_LIGHT_LAUNCH_01.ogg");
    sfx.loop = false;
    sfx.volume = 1.0;
    lightLaunchSfx.current = sfx;
  }
  const clashSfx = useRef<HTMLAudioElement | null>(null);
  if (!clashSfx.current) {
    const sfx = new Audio("/SFX/dragon-studio-epic-spell-impact-478364.mp3");
    sfx.loop = false;
    sfx.volume = 1.0;
    clashSfx.current = sfx;
  }

  // Beam animation states (procedural)
  const redBeamState = useRef<BeamState>(createBeamState());
  const blueBeamState = useRef<BeamState>(createBeamState());

  // Track last consumed dial hit result to avoid re-processing
  const lastDialResult = useRef<boolean | null>(null);

  // CPU state
  const cpuState = useRef(createCpuState());
  const lastRegenCount = useRef(0);
  const cpuTurnTakenThisLap = useRef(false);

  /** Run the CPU's virtual turn and return the points scored (0 if miss). */
  const doCpuTurn = (): number => {
    if (useGameStore.getState().phase === "ended") return 0;
    cpuTurnTakenThisLap.current = true;
    const difficulty = useGameStore.getState().difficulty;
    const { result, next } = cpuTakeTurn(cpuState.current, difficulty);
    cpuState.current = next;
    return result.hit ? result.points : 0;
  };

  /** Resolve a round and trigger the appropriate attack/clash animation based on delta. */
  const doResolveRound = (playerHit: number, cpuHit: number) => {
    const delta = playerHit - cpuHit;
    useGameStore.getState().resolveRound(playerHit, cpuHit);

    // Play impact SFX based on who got hit
    const { sfxEnabled: sfxOn, muted } = useGameStore.getState();
    const canSfx = sfxOn && !muted;
    if (canSfx && delta > 0 && fireImpactSfx.current) {
      fireImpactSfx.current.currentTime = 0;
      fireImpactSfx.current.play().catch(() => {});
    } else if (canSfx && delta < 0 && lightImpactSfx.current) {
      lightImpactSfx.current.currentTime = 0;
      lightImpactSfx.current.play().catch(() => {});
    }

    // Check if round resolution triggered game-over
    const storePhase = useGameStore.getState().phase;
    if (storePhase === "ended" && phase.current !== "player_lose" && phase.current !== "player_win") {
      const playerWon = useGameStore.getState().score > 0;
      if (playerWon) {
        winnerText.current = "You Win";
        phase.current = "player_win";
        resetPhaseFrames();
        dialGame.stop();
        startShake();
        // Spawn explosion particles on the opponent
        spawnExplosion(
          explosionParticles.current,
          opponentX.current + layout.characters.charSize * 0.5,
          layout.positions.groundY + layout.characters.charSize * 0.4,
        );
        // Play fire launch SFX on player win
        if (canSfx && fireLaunchSfx.current) {
          fireLaunchSfx.current.currentTime = 0;
          fireLaunchSfx.current.play().catch(() => {});
        }
      } else {
        winnerText.current = "You Lose";
        phase.current = "player_lose";
        resetPhaseFrames();
        dialGame.stop();
        startShake();
        // Spawn explosion particles on the player
        spawnExplosion(
          explosionParticles.current,
          playerX.current + layout.characters.charSize * 0.5,
          layout.positions.groundY + layout.characters.charSize * 0.4,
        );
        // Play light launch SFX on player lose
        if (canSfx && lightLaunchSfx.current) {
          lightLaunchSfx.current.currentTime = 0;
          lightLaunchSfx.current.play().catch(() => {});
        }
      }
      return;
    }

    // Choose animation based on delta
    if (delta > 0) {
      // Player hit — shake on opponent, stay in idle
      startShake();
    } else if (delta < 0) {
      // Opponent hit — shake on player, stay in idle
      startShake();
    } else {
      // delta === 0: clash — shake + sparks at laser impact point
      startShake();
      const clashX = (laserImpactLerpX.current ?? layout.positions.meetX) - layout.characters.charSize * 0.3;
      const clashY =
        layout.positions.groundY + layout.characters.charSize * 0.66;
      spawnSparks(sparkParticles.current, clashX, clashY);
      if (clashSfx.current) {
        clashSfx.current.currentTime = 0;
        if (canSfx) clashSfx.current.play().catch(() => {});
      }
    }
  };

  // â”€â”€ Attach Graphics layers to the container â”€â”€

  useEffect(() => {
    const container = refs.container.current;
    if (!container) return;

    const sGfx = new Graphics();
    const eGfx = new Graphics();
    sparkGfx.current = sGfx;
    explosionGfx.current = eGfx;
    container.addChild(sGfx);
    container.addChild(eGfx);

    return () => {
      container.removeChild(sGfx);
      container.removeChild(eGfx);
      sGfx.destroy();
      eGfx.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // â”€â”€ Input listener for dial game (Space / click / tap) â”€â”€

  useEffect(() => {
    const combatPhases: Phase[] = [
      "idle",
    ];

    const handleInput = (e?: KeyboardEvent) => {
      if (e && e.key !== " ") return;
      if (e) e.preventDefault();

      // Allow input during any combat phase (not fight_text / clash)
      if (!combatPhases.includes(phase.current)) return;
      if (!dialGame.active.current) return;

      const hit = dialGame.attempt();
      if (hit === null) return; // already attempted this lap â€” ignore

      // CPU also takes its turn
      const cpuHit = doCpuTurn();
      const playerHit = hit ? dialGame.lastHitPoints.current : 0;
      doResolveRound(playerHit, cpuHit);
    };

    const onKeyDown = (e: KeyboardEvent) => handleInput(e);
    const onPointerDown = () => handleInput();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialGame]);

  const resetPhaseFrames = () => {
    playerFrame.current = 0;
    opponentFrame.current = 0;
    playerElapsed.current = 0;
    opponentElapsed.current = 0;
    phaseAnimDone.current = false;
  };

  const startShake = () => {
    shakeTimer.current = SHAKE_DURATION;
    isShaking.current = true;
  };


  // â”€â”€ Main tick â”€â”€

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

    // Scale background to cover the viewport
    if (bgTexture !== Texture.EMPTY) {
      const s = Math.max(
        app.screen.width / bgTexture.width,
        app.screen.height / bgTexture.height,
      );
      bg.current.scale.set(s);
      bg.current.x = (app.screen.width - bgTexture.width * s) / 2;
      bg.current.y = (app.screen.height - bgTexture.height * s) / 2;
    }

    const dt = ticker.deltaTime / 60;
    const curPhase = phase.current;

    // — Sprite animation stepping —

    const playerAnimName = getAnimName("player", curPhase);
    const opponentAnimName = getAnimName("opponent", curPhase);
    const playerAnim = playerAnims[playerAnimName];
    const opponentAnim = opponentAnims[opponentAnimName];

    if (curPhase !== "player_win" && curPhase !== "player_lose" && curPhase !== "attack_intro") {
      if (attackIntroPlayed.current && playerAnimName === "Idle") {
        // Hold last frame of attack animation instead of Idle
        const atkAnim = playerAnims["Flame_jet"];
        player.current.texture = atkAnim[atkAnim.length - 1];
      } else {
        playerElapsed.current += dt;
        if (playerElapsed.current >= ANIM_SPEED) {
          playerElapsed.current = 0;
          playerFrame.current = (playerFrame.current + 1) % playerAnim.length;
          player.current.texture = playerAnim[playerFrame.current];
        }
      }

      if (attackIntroPlayed.current && opponentAnimName === "Idle") {
        // Hold last frame of attack animation instead of Idle
        const atkAnim = opponentAnims["Magic_arrow"];
        opponent.current.texture = atkAnim[atkAnim.length - 1];
      } else {
        opponentElapsed.current += dt;
        if (opponentElapsed.current >= ANIM_SPEED) {
          opponentElapsed.current = 0;
          opponentFrame.current = (opponentFrame.current + 1) % opponentAnim.length;
          opponent.current.texture = opponentAnim[opponentFrame.current];
        }
      }
    }
    switch (curPhase) {
      case "intro": {
        // Characters visible and idle; waiting for store phase change
        if (useGameStore.getState().phase === "playing") {
          // Make ring container visible but fully transparent
          if (refs.ringContainer.current) {
            refs.ringContainer.current.visible = true;
            refs.ringContainer.current.alpha = 0;
          }
          ringAlpha.current = 0;
          phase.current = "countdown";
          countdownText.current = "3";
          resetPhaseFrames();
          const step = COUNTDOWN_STEP_MS;
          setTimeout(() => { countdownText.current = "2"; }, step);
          setTimeout(() => { countdownText.current = "1"; }, step * 2);
          setTimeout(() => {
            countdownText.current = "FIGHT!";
          }, step * 3);
          setTimeout(() => {
            countdownText.current = null;
            phase.current = "attack_intro";
            resetPhaseFrames();
            dialGame.start();
          }, step * 3 + COUNTDOWN_FIGHT_MS);
        }
        break;
      }


      case "countdown": {
        // Fade in ring/dial during countdown
        if (ringAlpha.current < 1) {
          ringAlpha.current = Math.min(1, ringAlpha.current + dt / RING_FADE_IN_DURATION);
          if (refs.ringContainer.current) {
            refs.ringContainer.current.alpha = ringAlpha.current;
          }
        }
        break;
      }

      case "attack_intro": {
        // Play each character's attack animation once (no wrapping)
        const pAtk = playerAnims["Flame_jet"];
        const oAtk = opponentAnims["Magic_arrow"];

        // Show current frame texture
        player.current.texture = pAtk[playerFrame.current];
        opponent.current.texture = oAtk[opponentFrame.current];

        // Advance player
        playerElapsed.current += dt;
        if (playerElapsed.current >= ANIM_SPEED) {
          playerElapsed.current = 0;
          if (playerFrame.current < pAtk.length - 1) playerFrame.current++;
        }

        // Advance opponent
        opponentElapsed.current += dt;
        if (opponentElapsed.current >= ANIM_SPEED) {
          opponentElapsed.current = 0;
          if (opponentFrame.current < oAtk.length - 1) opponentFrame.current++;
        }

        // Transition to idle once both animations have completed
        if (
          playerFrame.current >= pAtk.length - 1 &&
          opponentFrame.current >= oAtk.length - 1 &&
          !phaseAnimDone.current
        ) {
          phaseAnimDone.current = true;
          attackIntroPlayed.current = true;
          phase.current = "idle";
          resetPhaseFrames();
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
          showWinText.current = false;
          winTextAlpha.current = 0;
          countdownText.current = null;
          ringAlpha.current = 0;
          sparkParticles.current = [];
          lastDialResult.current = null;
          cpuState.current = createCpuState();
          lastRegenCount.current = 0;
          cpuTurnTakenThisLap.current = false;
          attackIntroPlayed.current = false;
          explosionParticles.current = [];
          // Fully reset dial game state
          dialGame.start();
          dialGame.stop();
          // Hide ring container on full reset
          if (refs.ringContainer.current) {
            refs.ringContainer.current.visible = false;
            refs.ringContainer.current.alpha = 0;
          }

          if (storePhase === "playing") {
            phase.current = "intro";
            resetPhaseFrames();
          } else {
            phase.current = "intro";
            resetPhaseFrames();
          }
          break;
        }

        // Fade out ring during win phase
        if (ringAlpha.current > 0) {
          ringAlpha.current = Math.max(0, ringAlpha.current - dt / RING_FADE_IN_DURATION);
          if (refs.ringContainer.current) {
            refs.ringContainer.current.alpha = ringAlpha.current;
            if (ringAlpha.current <= 0) refs.ringContainer.current.visible = false;
          }
        }

        opponentElapsed.current += dt;
        if (opponentElapsed.current >= SLOWMO_ANIM_SPEED) {
          opponentElapsed.current = 0;
          if (opponentFrame.current < opponentAnim.length - 1) {
            opponentFrame.current++;
            opponent.current.texture = opponentAnim[opponentFrame.current];
          } else if (!phaseAnimDone.current) {
            phaseAnimDone.current = true;
            showWinText.current = true;
          }
        }

        // Animate winner (player) back to idle
        {
          const idleAnim = playerAnims["Idle"];
          playerElapsed.current += dt;
          if (playerElapsed.current >= ANIM_SPEED) {
            playerElapsed.current = 0;
            playerFrame.current = (playerFrame.current + 1) % idleAnim.length;
            player.current.texture = idleAnim[playerFrame.current];
          }
        }

        if (showWinText.current && winTextAlpha.current < 1) {
          winTextAlpha.current = Math.min(1, winTextAlpha.current + dt / WIN_TEXT_FADE_DURATION);
        }
        break;
        }
  
        case "player_lose": {
          const storePhase = useGameStore.getState().phase;
          if (storePhase !== "ended") {
            showWinText.current = false;
            winTextAlpha.current = 0;
            countdownText.current = null;
            ringAlpha.current = 0;
            sparkParticles.current = [];
            lastDialResult.current = null;
            cpuState.current = createCpuState();
            lastRegenCount.current = 0;
            cpuTurnTakenThisLap.current = false;
            attackIntroPlayed.current = false;
            explosionParticles.current = [];
            // Fully reset dial game state
            dialGame.start();
            dialGame.stop();
            // Hide ring container on full reset
            if (refs.ringContainer.current) {
              refs.ringContainer.current.visible = false;
              refs.ringContainer.current.alpha = 0;
            }
  
            if (storePhase === "playing") {
              phase.current = "intro";
              resetPhaseFrames();
            } else {
              phase.current = "intro";
              resetPhaseFrames();
            }
            break;
          }
  
          // Fade out ring during lose phase
          if (ringAlpha.current > 0) {
            ringAlpha.current = Math.max(0, ringAlpha.current - dt / RING_FADE_IN_DURATION);
            if (refs.ringContainer.current) {
              refs.ringContainer.current.alpha = ringAlpha.current;
              if (ringAlpha.current <= 0) refs.ringContainer.current.visible = false;
            }
          }

          // Slow-motion player death animation
          playerElapsed.current += dt;
          if (playerElapsed.current >= SLOWMO_ANIM_SPEED) {
            playerElapsed.current = 0;
            if (playerFrame.current < playerAnim.length - 1) {
              playerFrame.current++;
              player.current.texture = playerAnim[playerFrame.current];
            } else if (!phaseAnimDone.current) {
              phaseAnimDone.current = true;
              showWinText.current = true;
            }
          }

          // Animate winner (opponent) back to idle
          {
            const idleAnim = opponentAnims["Idle"];
            opponentElapsed.current += dt;
            if (opponentElapsed.current >= ANIM_SPEED) {
              opponentElapsed.current = 0;
              opponentFrame.current = (opponentFrame.current + 1) % idleAnim.length;
              opponent.current.texture = idleAnim[opponentFrame.current];
            }
          }
  
          if (showWinText.current && winTextAlpha.current < 1) {
            winTextAlpha.current = Math.min(1, winTextAlpha.current + dt / WIN_TEXT_FADE_DURATION);
          }
          break;
        }
    }

    // â”€â”€ CPU turn on block regeneration (only if no player hit triggered it already) â”€â”€
    const currentRegen = dialGame.regenCount.current;
    if (currentRegen > lastRegenCount.current) {
      const isFirstGate = lastRegenCount.current === 0;
      lastRegenCount.current = currentRegen;
      // Skip the very first gate â€” blocks are just being generated, the player
      // hasn't had a chance to act yet. Only resolve on subsequent gates.
      if (!isFirstGate && !cpuTurnTakenThisLap.current && phase.current !== "attack_intro") {
        // Player missed or skipped — player hit = 0, CPU takes a turn
        const cpuHit = doCpuTurn();
        doResolveRound(0, cpuHit);
      }
      cpuTurnTakenThisLap.current = false;
    }

    // ── Apply positions & orientation ──

    player.current.x = playerX.current;
    opponent.current.x = opponentX.current;

    player.current.scale.x = layout.characters.charScale;
    player.current.anchor.x = 0;

    opponent.current.scale.x = -layout.characters.charScale;
    opponent.current.anchor.x = 1;

    // ── Procedural beam rendering (visible only during attack-loop after intro) ──

    const redGfx = refs.redBeamGfx.current;
    const blueGfx = refs.blueBeamGfx.current;

    const showBeams =
      attackIntroPlayed.current &&
      curPhase !== "intro" &&
      curPhase !== "attack_intro" &&
      curPhase !== "player_win" &&
      curPhase !== "player_lose";

    if (redGfx && blueGfx) {
      if (showBeams) {
        redGfx.visible = true;
        blueGfx.visible = true;

        // Start beam SFX when beams first appear
        if (!laserSfxPlaying.current) {
          const { sfxEnabled: sfxEn, muted: isMuted } = useGameStore.getState();
          const canPlay = sfxEn && !isMuted;
          if (canPlay && fireHoldSfx.current) {
            fireHoldSfx.current.currentTime = 0;
            fireHoldSfx.current.play().catch(() => {});
          }
          if (canPlay && lightHoldSfx.current) {
            lightHoldSfx.current.currentTime = 0;
            lightHoldSfx.current.play().catch(() => {});
          }
          // Play spell cast sounds (one-shot)
          if (canPlay && laserCastSfx.current) {
            laserCastSfx.current.currentTime = 0;
            laserCastSfx.current.play().catch(() => {});
          }
          if (canPlay && fireCastSfx.current) {
            fireCastSfx.current.currentTime = 0;
            fireCastSfx.current.play().catch(() => {});
          }
          laserSfxPlaying.current = true;
        }

        // Pause/resume looping hold SFX when mute changes mid-game
        if (laserSfxPlaying.current) {
          const { sfxEnabled: sfxEn, muted: isMuted } = useGameStore.getState();
          const shouldPlay = sfxEn && !isMuted;
          if (!shouldPlay) {
            if (fireHoldSfx.current && !fireHoldSfx.current.paused) fireHoldSfx.current.pause();
            if (lightHoldSfx.current && !lightHoldSfx.current.paused) lightHoldSfx.current.pause();
          } else {
            if (fireHoldSfx.current && fireHoldSfx.current.paused) fireHoldSfx.current.play().catch(() => {});
            if (lightHoldSfx.current && lightHoldSfx.current.paused) lightHoldSfx.current.play().catch(() => {});
          }
        }

        // ── Compute shared beam positions ──
        const charSize = layout.characters.charSize;
        const beamHalfH = charSize * 0.07;
        const beamY = layout.positions.groundY + charSize * 0.66;

        // Red beam origin: at the edge of the fire mage (right side of sprite)
        const redOriginX = playerX.current + charSize * 0.75;

        // Blue beam origin: at the edge of the wanderer mage (left side of mirrored sprite)
        const blueOriginX = opponentX.current + charSize * 0.25;

        // Impact X: shifts proportionally to score bar (smoothly lerped)
        const smallScreen = layout.base.unit < 500;
        const scorePct = Math.min(1, Math.max(-1, useGameStore.getState().score / WIN_POINTS));
        const baseBarW = layout.ring.outerRadius * 2;
        const widthMult = Math.min(2.2, Math.max(1, layout.base.width / 800));
        const halfBarW = (baseBarW * widthMult) / 2;
        const baseImpactX = layout.positions.meetX + charSize * (smallScreen ? 0.2 : 0.3);
        const travelMult = smallScreen ? 0.8 : 1.5;
        const targetImpactX = baseImpactX + halfBarW * scorePct * travelMult;

        // Smooth lerp toward target
        if (laserImpactLerpX.current === null) {
          laserImpactLerpX.current = targetImpactX;
        } else {
          laserImpactLerpX.current += (targetImpactX - laserImpactLerpX.current) * 0.06;
        }
        const impactX = laserImpactLerpX.current;

        // Blue impact X (mirrored offset)
        const blueBaseImpactX = layout.positions.meetX - charSize * (smallScreen ? 0.31 : 0.21);
        const blueLerpedShift = impactX - baseImpactX;
        const blueImpactX = blueBaseImpactX + blueLerpedShift;

        // ── Draw red beam (player → right) ──
        drawBeam(
          redGfx,
          redBeamState.current,
          RED_BEAM_CONFIG,
          redOriginX,
          beamY,
          impactX,
          beamY,
          beamHalfH,
          dt,
        );

        // ── Draw blue beam (opponent → left) ──
        drawBeam(
          blueGfx,
          blueBeamState.current,
          BLUE_BEAM_CONFIG,
          blueOriginX,
          beamY,
          blueImpactX,
          beamY,
          beamHalfH,
          dt,
        );
      } else {
        redGfx.visible = false;
        blueGfx.visible = false;
        redGfx.clear();
        blueGfx.clear();
        resetBeamState(redBeamState.current);
        resetBeamState(blueBeamState.current);
        laserImpactLerpX.current = null;

        // Stop beam SFX when beams hide
        if (laserSfxPlaying.current) {
          if (fireHoldSfx.current) fireHoldSfx.current.pause();
          if (lightHoldSfx.current) lightHoldSfx.current.pause();
          laserSfxPlaying.current = false;
        }
      }
    }
    // â”€â”€ Screen shake â”€â”€

    if (isShaking.current) {
      shakeTimer.current -= dt;
      if (shakeTimer.current <= 0) {
        isShaking.current = false;
        container.current.x = 0;
        container.current.y = 0;
      } else {
        const progress = shakeTimer.current / SHAKE_DURATION;
        const intensity = layout.movement.shakeIntensity * progress;
        container.current.x = (Math.random() - 0.5) * 2 * intensity;
        container.current.y = (Math.random() - 0.5) * 2 * intensity;
      }
    }


    // ── Spark particles ──

    const sGfx = sparkGfx.current;
    if (sGfx) {
      sparkParticles.current = updateSparkParticles(
        sGfx,
        sparkParticles.current,
        dt,
      );
    }

    // ── Explosion particles ──

    const eGfx = explosionGfx.current;
    if (eGfx) {
      explosionParticles.current = updateExplosionParticles(
        eGfx,
        explosionParticles.current,
        dt,
      );
    }
  });

  return { showWinText, winTextAlpha, winnerText, countdownText, ringAlpha };
}
