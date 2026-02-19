import { useTick } from "@pixi/react";
import { Graphics, Texture } from "pixi.js";
import { useEffect, useRef } from "react";

import {
  ANIM_SPEED,
  CLASH_PAUSE_MS,
  COUNTDOWN_FIGHT_MS,
  COUNTDOWN_STEP_MS,
  HIT_FREEZE_MS,
  HURT_PAUSE_MS,
  RING_FADE_IN_DURATION,
  SHAKE_DURATION,
  SLOWMO_ANIM_SPEED,
  WIN_TEXT_FADE_DURATION,
} from "../constants";
import { useGameStore } from "../../state";
import type { BloodParticle, Phase } from "../types";
import type { SparkParticle } from "../utils/particles";
import {
  spawnBlood,
  spawnSparks,
  updateBloodParticles,
  updateSparkParticles,
} from "../utils/particles";
import { getAnimName } from "../utils/phases";
import { cpuTakeTurn, createCpuState } from "../services/cpuService";
import type { GameLoopParams } from "./types/useGameLoop.types";

export function useGameLoop({
  app,
  refs,
  bgTexture,
  samuraiAnims,
  shinobiAnims,
  dialGame,
  layout,
}: GameLoopParams) {
  const bloodGfx = useRef<Graphics | null>(null);
  const sparkGfx = useRef<Graphics | null>(null);

  // Win/Lose text state (read by Scene for rendering)
  const showWinText = useRef(false);
  const winTextAlpha = useRef(0);
  const winnerText = useRef("You Win");

  // Countdown state (read by Scene for rendering)
  const countdownText = useRef<string | null>(null);  // "3", "2", "1", "FIGHT!" or null
  const ringAlpha = useRef(0);                        // fade-in alpha for the ring container

  // Phase state machine
  const phase = useRef<Phase>("intro");
  const samuraiX = useRef(layout.positions.charStartX);
  const shinobiX = useRef(layout.positions.charEndX);

  const samuraiFightX = useRef(0);
  const shinobiFightX = useRef(0);

  const samuraiFrame = useRef(0);
  const shinobiFrame = useRef(0);
  const samuraiElapsed = useRef(0);
  const shinobiElapsed = useRef(0);
  const phaseAnimDone = useRef(false);

  const shakeTimer = useRef(0);
  const isShaking = useRef(false);

  const samuraiKnockback = useRef(0);
  const shinobiKnockback = useRef(0);

  const bloodParticles = useRef<BloodParticle[]>([]);
  const sparkParticles = useRef<SparkParticle[]>([]);

  const clashSparkEmitted = useRef(false);

  // Track last consumed dial hit result to avoid re-processing
  const lastDialResult = useRef<boolean | null>(null);

  // Track pending phase-transition timeouts so we can cancel on rapid input
  const pendingTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  // CPU state — independent block count & katana streak
  const cpuState = useRef(createCpuState());
  const cpuHitColors = useRef<number[]>([]);
  const lastRegenCount = useRef(0);
  const cpuTurnTakenThisLap = useRef(false);

  /** Run the CPU's virtual turn and return the points scored (0 if miss). */
  const doCpuTurn = (): number => {
    if (useGameStore.getState().phase === "ended") return 0;
    cpuTurnTakenThisLap.current = true;
    const difficulty = useGameStore.getState().difficulty;
    const { result, next } = cpuTakeTurn(cpuState.current, difficulty);
    cpuState.current = next;
    cpuHitColors.current = next.hitColors;
    return result.hit ? result.points : 0;
  };

  /** Resolve a round and trigger the appropriate attack/clash animation based on delta. */
  const doResolveRound = (playerHit: number, cpuHit: number) => {
    const delta = playerHit - cpuHit;
    useGameStore.getState().resolveRound(playerHit, cpuHit);

    // Check if round resolution triggered game-over
    const storePhase = useGameStore.getState().phase;
    if (storePhase === "ended" && phase.current !== "player_lose" && phase.current !== "player_win") {
      const playerWon = useGameStore.getState().playerPoints > useGameStore.getState().opponentPoints;
      if (playerWon) {
        winnerText.current = "You Win";
        phase.current = "player_win";
        resetPhaseFrames();
        dialGame.stop();
        if (refs.ringContainer.current) refs.ringContainer.current.visible = false;
        if (refs.katanaContainer.current) refs.katanaContainer.current.visible = false;
        if (refs.cpuKatanaContainer.current) refs.cpuKatanaContainer.current.visible = false;
        startShake();
        shinobiKnockback.current = layout.movement.knockbackDistance;
        spawnBlood(
          bloodParticles.current,
          shinobiX.current + layout.characters.charSize * 0.4,
          layout.positions.groundY + layout.characters.charSize * 0.4,
          1,
        );
      } else {
        winnerText.current = "You Lose";
        phase.current = "player_lose";
        resetPhaseFrames();
        dialGame.stop();
        if (refs.ringContainer.current) refs.ringContainer.current.visible = false;
        if (refs.katanaContainer.current) refs.katanaContainer.current.visible = false;
        if (refs.cpuKatanaContainer.current) refs.cpuKatanaContainer.current.visible = false;
        startShake();
        samuraiKnockback.current = layout.movement.knockbackDistance;
        spawnBlood(
          bloodParticles.current,
          samuraiX.current + layout.characters.charSize * 0.4,
          layout.positions.groundY + layout.characters.charSize * 0.4,
          -1,
        );
      }
      return;
    }

    // Choose animation based on delta
    if (delta > 0) {
      phase.current = "samurai_attack";
      resetPhaseFrames();
    } else if (delta < 0) {
      phase.current = "shinobi_attack";
      resetPhaseFrames();
    } else {
      // delta === 0: clash
      phase.current = "clash";
      resetPhaseFrames();
      clashSparkEmitted.current = false;
    }
  };

  // ── Attach Graphics layers to the container ──

  useEffect(() => {
    const container = refs.container.current;
    if (!container) return;

    const bGfx = new Graphics();
    const sGfx = new Graphics();
    bloodGfx.current = bGfx;
    sparkGfx.current = sGfx;
    container.addChild(bGfx);
    container.addChild(sGfx);

    return () => {
      container.removeChild(bGfx);
      container.removeChild(sGfx);
      bGfx.destroy();
      sGfx.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Input listener for dial game (Space / click / tap) ──

  useEffect(() => {
    const combatPhases: Phase[] = [
      "idle",
      "samurai_attack",
      "shinobi_hurt",
      "shinobi_recover",
      "shinobi_attack",
      "samurai_hurt",
      "samurai_recover",
      "samurai_idle_wait",
      "shinobi_idle_wait",
    ];

    const handleInput = (e?: KeyboardEvent) => {
      if (e && e.key !== " ") return;
      if (e) e.preventDefault();

      // Allow input during any combat phase (not run / fight_text / clash)
      if (!combatPhases.includes(phase.current)) return;
      if (!dialGame.active.current) return;

      const hit = dialGame.attempt();
      if (hit === null) return; // already attempted this lap — ignore

      // Cancel every pending phase-transition timeout
      for (const id of pendingTimeouts.current) clearTimeout(id);
      pendingTimeouts.current = [];

      // Snap characters back to fight positions & clear residual knockback
      samuraiX.current = samuraiFightX.current;
      shinobiX.current = shinobiFightX.current;
      samuraiKnockback.current = 0;
      shinobiKnockback.current = 0;

      // CPU also takes its turn — resolve round together (animation chosen by delta)
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
    samuraiFrame.current = 0;
    shinobiFrame.current = 0;
    samuraiElapsed.current = 0;
    shinobiElapsed.current = 0;
    phaseAnimDone.current = false;
  };

  const startShake = () => {
    shakeTimer.current = SHAKE_DURATION;
    isShaking.current = true;
  };

  /** Schedule a timeout and track it so it can be cancelled on rapid input. */
  const schedulePhase = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      // Remove from tracking once it fires
      pendingTimeouts.current = pendingTimeouts.current.filter((t) => t !== id);
      fn();
    }, ms);
    pendingTimeouts.current.push(id);
  };

  // ── Main tick ──

  useTick((ticker) => {
    const { container, bg, samurai, shinobi } = refs;
    if (
      !samurai.current ||
      !shinobi.current ||
      !container.current ||
      !bg.current
    )
      return;
    if (!samuraiAnims || !shinobiAnims) return;

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

    // ── Sprite animation stepping ──

    const samAnim = samuraiAnims[getAnimName("samurai", curPhase)];
    const shinAnim = shinobiAnims[getAnimName("shinobi", curPhase)];

    if (curPhase !== "player_win" && curPhase !== "player_lose") {
      samuraiElapsed.current += dt;
      if (samuraiElapsed.current >= ANIM_SPEED) {
        samuraiElapsed.current = 0;
        samuraiFrame.current = (samuraiFrame.current + 1) % samAnim.length;
        samurai.current.texture = samAnim[samuraiFrame.current];
      }

      shinobiElapsed.current += dt;
      if (shinobiElapsed.current >= ANIM_SPEED) {
        shinobiElapsed.current = 0;
        shinobiFrame.current = (shinobiFrame.current + 1) % shinAnim.length;
        shinobi.current.texture = shinAnim[shinobiFrame.current];
      }
    }

    // ── Knockback ──

    if (samuraiKnockback.current > 0) {
      const kb = Math.min(
        samuraiKnockback.current,
        layout.movement.knockbackSpeed * dt,
      );
      samuraiX.current -= kb;
      samuraiKnockback.current -= kb;
    }
    if (shinobiKnockback.current > 0) {
      const kb = Math.min(
        shinobiKnockback.current,
        layout.movement.knockbackSpeed * dt,
      );
      shinobiX.current += kb;
      shinobiKnockback.current -= kb;
    }

    // ── Phase state machine ──

    const meetDist = layout.characters.charSize + layout.movement.meetGap;

    switch (curPhase) {
      case "intro": {
        // Characters visible and idle at screen edges; waiting for store phase change
        if (useGameStore.getState().phase === "playing") {
          phase.current = "run";
          resetPhaseFrames();
        }
        break;
      }

      case "run": {
        samuraiX.current += layout.movement.runSpeed * dt;
        shinobiX.current -= layout.movement.runSpeed * dt;
        if (shinobiX.current - samuraiX.current <= meetDist) {
          const cx = (samuraiX.current + shinobiX.current) / 2;
          samuraiX.current =
            cx - layout.characters.charSize / 2 - layout.movement.meetGap / 2;
          shinobiX.current =
            cx + layout.characters.charSize / 2 + layout.movement.meetGap / 2;
          samuraiFightX.current = samuraiX.current;
          shinobiFightX.current = shinobiX.current;
          // Make ring & katana containers visible but fully transparent — they will fade in
          if (refs.ringContainer.current) {
            refs.ringContainer.current.visible = true;
            refs.ringContainer.current.alpha = 0;
          }
          if (refs.katanaContainer.current) {
            refs.katanaContainer.current.visible = true;
          }
          if (refs.cpuKatanaContainer.current) {
            refs.cpuKatanaContainer.current.visible = true;
          }
          ringAlpha.current = 0;
          // Start countdown sequence: 3 → 2 → 1 → FIGHT!
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
            phase.current = "idle";
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

      case "fight_text":
      case "idle": {
        // Auto-miss detection is handled by the regen path (CPU turn on block
        // regeneration) which calls doResolveRound — that now triggers the
        // correct attack/clash animation based on delta.
        break;
      }

      case "samurai_attack": {
        if (
          samuraiFrame.current === samAnim.length - 1 &&
          !phaseAnimDone.current
        ) {
          phaseAnimDone.current = true;
          schedulePhase(() => {
            const isGameOver = useGameStore.getState().phase === "ended";
            if (isGameOver) {
              winnerText.current = "You Win";
              phase.current = "player_win";
              resetPhaseFrames();
              dialGame.stop();
              if (refs.ringContainer.current) refs.ringContainer.current.visible = false;
              if (refs.katanaContainer.current) refs.katanaContainer.current.visible = false;
              if (refs.cpuKatanaContainer.current) refs.cpuKatanaContainer.current.visible = false;
              startShake();
              shinobiKnockback.current = layout.movement.knockbackDistance;
              spawnBlood(
                bloodParticles.current,
                shinobiX.current + layout.characters.charSize * 0.4,
                layout.positions.groundY + layout.characters.charSize * 0.4,
                1,
              );
              return;
            }
            phase.current = "shinobi_hurt";
            resetPhaseFrames();
            startShake();
            shinobiKnockback.current = layout.movement.knockbackDistance;
            spawnBlood(
              bloodParticles.current,
              shinobiX.current + layout.characters.charSize * 0.4,
              layout.positions.groundY + layout.characters.charSize * 0.4,
              1,
            );
          }, HIT_FREEZE_MS);
        }
        break;
      }

      case "shinobi_attack": {
        if (
          shinobiFrame.current === shinAnim.length - 1 &&
          !phaseAnimDone.current
        ) {
          phaseAnimDone.current = true;
          schedulePhase(() => {
            const isGameOver = useGameStore.getState().phase === "ended";
            if (isGameOver) {
              winnerText.current = "You Lose";
              phase.current = "player_lose";
              resetPhaseFrames();
              dialGame.stop();
              if (refs.ringContainer.current) refs.ringContainer.current.visible = false;
              if (refs.katanaContainer.current) refs.katanaContainer.current.visible = false;
              if (refs.cpuKatanaContainer.current) refs.cpuKatanaContainer.current.visible = false;
              startShake();
              samuraiKnockback.current = layout.movement.knockbackDistance;
              spawnBlood(
                bloodParticles.current,
                samuraiX.current + layout.characters.charSize * 0.4,
                layout.positions.groundY + layout.characters.charSize * 0.4,
                -1,
              );
              return;
            }
            phase.current = "samurai_hurt";
            resetPhaseFrames();
            startShake();
            samuraiKnockback.current = layout.movement.knockbackDistance;
            spawnBlood(
              bloodParticles.current,
              samuraiX.current + layout.characters.charSize * 0.4,
              layout.positions.groundY + layout.characters.charSize * 0.4,
              -1,
            );
          }, HIT_FREEZE_MS);
        }
        break;
      }

      case "samurai_hurt": {
        if (
          samuraiFrame.current === samAnim.length - 1 &&
          !phaseAnimDone.current
        ) {
          phaseAnimDone.current = true;
          schedulePhase(() => {
            phase.current = "samurai_recover";
            resetPhaseFrames();
          }, HURT_PAUSE_MS);
        }
        break;
      }

      case "samurai_recover": {
        if (samuraiX.current < samuraiFightX.current) {
          samuraiX.current += layout.movement.recoverSpeed * dt;
          if (samuraiX.current >= samuraiFightX.current) {
            samuraiX.current = samuraiFightX.current;
            // Return to idle — dial resumes
            phase.current = "idle";
            resetPhaseFrames();
          }
        } else {
          phase.current = "idle";
          resetPhaseFrames();
        }
        break;
      }

      case "shinobi_hurt": {
        if (
          shinobiFrame.current === shinAnim.length - 1 &&
          !phaseAnimDone.current
        ) {
          phaseAnimDone.current = true;
          schedulePhase(() => {
            phase.current = "shinobi_recover";
            resetPhaseFrames();
          }, HURT_PAUSE_MS);
        }
        break;
      }

      case "shinobi_recover": {
        if (shinobiX.current > shinobiFightX.current) {
          shinobiX.current -= layout.movement.recoverSpeed * dt;
          if (shinobiX.current <= shinobiFightX.current) {
            shinobiX.current = shinobiFightX.current;
            // Return to idle — dial resumes
            phase.current = "idle";
            resetPhaseFrames();
          }
        } else {
          phase.current = "idle";
          resetPhaseFrames();
        }
        break;
      }

      case "samurai_idle_wait": {
        if (!phaseAnimDone.current) {
          phaseAnimDone.current = true;
          phase.current = "idle";
          resetPhaseFrames();
        }
        break;
      }

      case "shinobi_idle_wait": {
        if (!phaseAnimDone.current) {
          phaseAnimDone.current = true;
          phase.current = "idle";
          resetPhaseFrames();
        }
        break;
      }

      case "clash": {
        if (phaseAnimDone.current) break;

        const samImpact = Math.floor(samAnim.length * 0.6);
        const shinImpact = Math.floor(shinAnim.length * 0.6);
        const atImpact =
          samuraiFrame.current >= samImpact ||
          shinobiFrame.current >= shinImpact;

        if (atImpact && !clashSparkEmitted.current) {
          clashSparkEmitted.current = true;
          startShake();
          const clashX =
            (samuraiX.current + layout.characters.charSize + shinobiX.current) /
            2;
          const clashY =
            layout.positions.groundY + layout.characters.charSize * 0.35;
          spawnSparks(sparkParticles.current, clashX, clashY);
        }

        // Play once — when the animation finishes, return to idle after a short pause
        if (
          samuraiFrame.current === samAnim.length - 1 ||
          shinobiFrame.current === shinAnim.length - 1
        ) {
          phaseAnimDone.current = true;
          schedulePhase(() => {
            phase.current = "idle";
            resetPhaseFrames();
          }, CLASH_PAUSE_MS);
        }
        break;
      }

      case "player_win": {
        const storePhase = useGameStore.getState().phase;
        if (storePhase !== "ended") {
          showWinText.current = false;
          winTextAlpha.current = 0;
          countdownText.current = null;
          ringAlpha.current = 0;
          samuraiX.current = layout.positions.charStartX;
          shinobiX.current = layout.positions.charEndX;
          samuraiKnockback.current = 0;
          shinobiKnockback.current = 0;
          bloodParticles.current = [];
          sparkParticles.current = [];
          for (const id of pendingTimeouts.current) clearTimeout(id);
          pendingTimeouts.current = [];
          lastDialResult.current = null;
          cpuState.current = createCpuState();
          cpuHitColors.current = [];
          lastRegenCount.current = 0;
          cpuTurnTakenThisLap.current = false;
          // Fully reset dial game state (blocks, speed, colors, katanas)
          dialGame.start();
          dialGame.stop();
          // Hide ring & katana containers on full reset
          if (refs.ringContainer.current) {
            refs.ringContainer.current.visible = false;
            refs.ringContainer.current.alpha = 0;
          }
          if (refs.katanaContainer.current) refs.katanaContainer.current.visible = false;
          if (refs.cpuKatanaContainer.current) refs.cpuKatanaContainer.current.visible = false;

          if (storePhase === "playing") {
            phase.current = "run";
            resetPhaseFrames();
          } else {
            phase.current = "intro";
            resetPhaseFrames();
          }
          break;
        }

        shinobiElapsed.current += dt;
        if (shinobiElapsed.current >= SLOWMO_ANIM_SPEED) {
          shinobiElapsed.current = 0;
          if (shinobiFrame.current < shinAnim.length - 1) {
            shinobiFrame.current++;
            shinobi.current.texture = shinAnim[shinobiFrame.current];
          } else if (!phaseAnimDone.current) {
            phaseAnimDone.current = true;
            showWinText.current = true;
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
            samuraiX.current = layout.positions.charStartX;
            shinobiX.current = layout.positions.charEndX;
            samuraiKnockback.current = 0;
            shinobiKnockback.current = 0;
            bloodParticles.current = [];
            sparkParticles.current = [];
            for (const id of pendingTimeouts.current) clearTimeout(id);
            pendingTimeouts.current = [];
            lastDialResult.current = null;
            cpuState.current = createCpuState();
            cpuHitColors.current = [];
            lastRegenCount.current = 0;
            cpuTurnTakenThisLap.current = false;
            // Fully reset dial game state (blocks, speed, colors, katanas)
            dialGame.start();
            dialGame.stop();
            // Hide ring & katana containers on full reset
            if (refs.ringContainer.current) {
              refs.ringContainer.current.visible = false;
              refs.ringContainer.current.alpha = 0;
            }
            if (refs.katanaContainer.current) refs.katanaContainer.current.visible = false;
            if (refs.cpuKatanaContainer.current) refs.cpuKatanaContainer.current.visible = false;
  
            if (storePhase === "playing") {
              phase.current = "run";
              resetPhaseFrames();
            } else {
              phase.current = "intro";
              resetPhaseFrames();
            }
            break;
          }
  
          // Slow-motion samurai death animation
          samuraiElapsed.current += dt;
          if (samuraiElapsed.current >= SLOWMO_ANIM_SPEED) {
            samuraiElapsed.current = 0;
            if (samuraiFrame.current < samAnim.length - 1) {
              samuraiFrame.current++;
              samurai.current.texture = samAnim[samuraiFrame.current];
            } else if (!phaseAnimDone.current) {
              phaseAnimDone.current = true;
              showWinText.current = true;
            }
          }
  
          if (showWinText.current && winTextAlpha.current < 1) {
            winTextAlpha.current = Math.min(1, winTextAlpha.current + dt / WIN_TEXT_FADE_DURATION);
          }
          break;
        }
    }

    // ── CPU turn on block regeneration (only if no player hit triggered it already) ──
    const currentRegen = dialGame.regenCount.current;
    if (currentRegen > lastRegenCount.current) {
      const isFirstGate = lastRegenCount.current === 0;
      lastRegenCount.current = currentRegen;
      // Skip the very first gate — blocks are just being generated, the player
      // hasn't had a chance to act yet. Only resolve on subsequent gates.
      if (!isFirstGate && !cpuTurnTakenThisLap.current) {
        // Player missed or skipped — player hit = 0, CPU takes a turn
        const cpuHit = doCpuTurn();
        doResolveRound(0, cpuHit);
      }
      cpuTurnTakenThisLap.current = false;
    }

    // ── Apply positions & orientation ──

    samurai.current.x = samuraiX.current;
    shinobi.current.x = shinobiX.current;

    samurai.current.scale.x = layout.characters.charScale;
    samurai.current.anchor.x = 0;

    shinobi.current.scale.x = -layout.characters.charScale;
    shinobi.current.anchor.x = 1;

    // ── Screen shake ──

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

    // ── Blood particles ──

    const bGfx = bloodGfx.current;
    if (bGfx) {
      bloodParticles.current = updateBloodParticles(
        bGfx,
        bloodParticles.current,
        dt,
      );
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
  });

  return { showWinText, winTextAlpha, winnerText, countdownText, ringAlpha, cpuHitColors };
}
