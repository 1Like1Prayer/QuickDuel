import type { Application as PixiApp } from "pixi.js";
import { Graphics, Sprite, Texture, Container } from "pixi.js";
import { useTick } from "@pixi/react";
import { useEffect, useRef } from "react";

import {
  ANIM_SPEED,
  HIT_FREEZE_MS,
  HURT_PAUSE_MS,
  FIGHT_TEXT_DURATION_MS,
  CLASH_PAUSE_MS,
  SHAKE_DURATION,
} from "../constants";
import { getAnimName } from "../utils/phases";
import {
  spawnBlood,
  updateBloodParticles,
  spawnSparks,
  updateSparkParticles,
} from "../utils/particles";
import type { SparkParticle } from "../utils/particles";
import type { BloodParticle, CharAnims, Phase } from "../types";
import type { UseDialGameReturn } from "./useDialGame";
import type { Layout } from "./useLayout";

// ──────────────────────────────────────────────
//  Refs bundle — keeps the hook signature clean
// ──────────────────────────────────────────────

export interface SceneRefs {
  container: React.RefObject<Container | null>;
  bg: React.RefObject<Sprite | null>;
  samurai: React.RefObject<Sprite | null>;
  shinobi: React.RefObject<Sprite | null>;
}

interface GameLoopParams {
  app: PixiApp;
  refs: SceneRefs;
  bgTexture: Texture;
  samuraiAnims: CharAnims | null;
  shinobiAnims: CharAnims | null;
  dialGame: UseDialGameReturn;
  /** Ref that Scene sets to true while "FIGHT!" text should be visible. */
  showFightText: React.RefObject<boolean>;
  /** Responsive layout values. */
  layout: Layout;
}

// ──────────────────────────────────────────────
//  Hook
// ──────────────────────────────────────────────

export function useGameLoop({
  app,
  refs,
  bgTexture,
  samuraiAnims,
  shinobiAnims,
  dialGame,
  showFightText,
  layout,
}: GameLoopParams) {
  const bloodGfx = useRef<Graphics | null>(null);
  const sparkGfx = useRef<Graphics | null>(null);

  // Phase state machine
  const phase = useRef<Phase>("run");
  const samuraiX = useRef(layout.charStartX);
  const shinobiX = useRef(0);
  const shinobiXInit = useRef(false);

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

      // Cancel every pending phase-transition timeout
      for (const id of pendingTimeouts.current) clearTimeout(id);
      pendingTimeouts.current = [];

      // Snap characters back to fight positions & clear residual knockback
      samuraiX.current = samuraiFightX.current;
      shinobiX.current = shinobiFightX.current;
      samuraiKnockback.current = 0;
      shinobiKnockback.current = 0;

      if (hit) {
        phase.current = "samurai_attack";
        resetPhaseFrames();
      } else {
        phase.current = "shinobi_attack";
        resetPhaseFrames();
      }
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

  // ── Helpers (closures over refs) ──

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

    // Initialise shinobi start position once we know screen width
    if (!shinobiXInit.current) {
      shinobiX.current = layout.charEndX;
      shinobiXInit.current = true;
    }

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

    // ── Knockback ──

    if (samuraiKnockback.current > 0) {
      const kb = Math.min(samuraiKnockback.current, layout.knockbackSpeed * dt);
      samuraiX.current -= kb;
      samuraiKnockback.current -= kb;
    }
    if (shinobiKnockback.current > 0) {
      const kb = Math.min(shinobiKnockback.current, layout.knockbackSpeed * dt);
      shinobiX.current += kb;
      shinobiKnockback.current -= kb;
    }

    // ── Phase state machine ──

    const meetDist = layout.charSize + layout.meetGap;

    switch (curPhase) {
      case "run": {
        samuraiX.current += layout.runSpeed * dt;
        shinobiX.current -= layout.runSpeed * dt;
        if (shinobiX.current - samuraiX.current <= meetDist) {
          const cx = (samuraiX.current + shinobiX.current) / 2;
          samuraiX.current = cx - layout.charSize / 2 - layout.meetGap / 2;
          shinobiX.current = cx + layout.charSize / 2 + layout.meetGap / 2;
          samuraiFightX.current = samuraiX.current;
          shinobiFightX.current = shinobiX.current;
          // Show "FIGHT!" text, then transition to idle
          phase.current = "fight_text";
          showFightText.current = true;
          resetPhaseFrames();
          setTimeout(() => {
            showFightText.current = false;
            phase.current = "idle";
            resetPhaseFrames();
            dialGame.start();
          }, FIGHT_TEXT_DURATION_MS);
        }
        break;
      }

      case "fight_text":
      case "idle": {
        // Characters idle, waiting for dial input.
        // Check if the dial game auto-missed (2 rotations without input)
        if (curPhase === "idle") {
          const dialHit = dialGame.lastHit.current;
          if (dialHit !== null && dialHit !== lastDialResult.current) {
            lastDialResult.current = dialHit;
            if (!dialHit) {
              // Auto-miss: player takes damage
              phase.current = "shinobi_attack";
              resetPhaseFrames();
            }
          }
        }
        break;
      }

      case "samurai_attack": {
        if (samuraiFrame.current === samAnim.length - 1 && !phaseAnimDone.current) {
          phaseAnimDone.current = true;
          schedulePhase(() => {
            phase.current = "shinobi_hurt";
            resetPhaseFrames();
            startShake();
            shinobiKnockback.current = layout.knockbackDistance;
            spawnBlood(
              bloodParticles.current,
              shinobiX.current + layout.charSize * 0.4,
              layout.groundY + layout.charSize * 0.4,
              1,
            );
          }, HIT_FREEZE_MS);
        }
        break;
      }

      case "shinobi_attack": {
        if (shinobiFrame.current === shinAnim.length - 1 && !phaseAnimDone.current) {
          phaseAnimDone.current = true;
          schedulePhase(() => {
            phase.current = "samurai_hurt";
            resetPhaseFrames();
            startShake();
            samuraiKnockback.current = layout.knockbackDistance;
            spawnBlood(
              bloodParticles.current,
              samuraiX.current + layout.charSize * 0.4,
              layout.groundY + layout.charSize * 0.4,
              -1,
            );
          }, HIT_FREEZE_MS);
        }
        break;
      }

      case "samurai_hurt": {
        if (samuraiFrame.current === samAnim.length - 1 && !phaseAnimDone.current) {
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
          samuraiX.current += layout.recoverSpeed * dt;
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
        if (shinobiFrame.current === shinAnim.length - 1 && !phaseAnimDone.current) {
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
          shinobiX.current -= layout.recoverSpeed * dt;
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
          const clashX = (samuraiX.current + layout.charSize + shinobiX.current) / 2;
          const clashY = layout.groundY + layout.charSize * 0.35;
          spawnSparks(sparkParticles.current, clashX, clashY);
        }

        if (
          samuraiFrame.current === samAnim.length - 1 ||
          shinobiFrame.current === shinAnim.length - 1
        ) {
          phaseAnimDone.current = true;
          setTimeout(() => {
            if (phase.current !== "clash") return;
            samuraiFrame.current = 0;
            shinobiFrame.current = 0;
            samuraiElapsed.current = 0;
            shinobiElapsed.current = 0;
            phaseAnimDone.current = false;
            clashSparkEmitted.current = false;
          }, CLASH_PAUSE_MS);
        }
        break;
      }
    }

    // ── Apply positions & orientation ──

    samurai.current.x = samuraiX.current;
    shinobi.current.x = shinobiX.current;

    samurai.current.scale.x = layout.charScale;
    samurai.current.anchor.x = 0;

    shinobi.current.scale.x = -layout.charScale;
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
        const intensity = layout.shakeIntensity * progress;
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
}
