import type { Application as PixiApp } from "pixi.js";
import { Graphics, Sprite, Texture, Container } from "pixi.js";
import { useTick } from "@pixi/react";
import { useEffect, useRef } from "react";

import {
  FRAME_SIZE,
  CHAR_SCALE,
  RUN_SPEED,
  ANIM_SPEED,
  MEET_GAP,
  RECOVER_SPEED,
  SHAKE_INTENSITY,
  SHAKE_DURATION,
  HIT_FREEZE_MS,
  KNOCKBACK_DISTANCE,
  RECOVER_IDLE_MS,
  KNOCKBACK_SPEED,
  HURT_PAUSE_MS,
  BLOOD_PARTICLE_COUNT,
  BLOOD_PARTICLE_SPEED,
  BLOOD_PARTICLE_GRAVITY,
  BLOOD_PARTICLE_LIFETIME,
  BLOOD_PARTICLE_SIZE,
  SPARK_PARTICLE_COUNT,
  SPARK_PARTICLE_SPEED,
  SPARK_PARTICLE_GRAVITY,
  SPARK_PARTICLE_LIFETIME,
  SPARK_PARTICLE_SIZE,
  CLASH_PAUSE_MS,
} from "../constants";
import { getAnimName } from "../utils/phases";
import type { BloodParticle, CharAnims, Phase } from "../types";

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
}

// Reuse BloodParticle shape for sparks (same physics, different color)
type SparkParticle = BloodParticle;

// ──────────────────────────────────────────────
//  Blood‑particle helpers
// ──────────────────────────────────────────────

function spawnBlood(
  particles: BloodParticle[],
  x: number,
  y: number,
  directionSign: number,
) {
  for (let i = 0; i < BLOOD_PARTICLE_COUNT; i++) {
    const angle = (Math.random() - 0.3) * Math.PI;
    const speed = BLOOD_PARTICLE_SPEED * (0.5 + Math.random() * 0.5);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed * directionSign,
      vy: -Math.abs(Math.sin(angle)) * speed * (0.5 + Math.random()),
      life: BLOOD_PARTICLE_LIFETIME * (0.5 + Math.random() * 0.5),
      size: BLOOD_PARTICLE_SIZE * (0.5 + Math.random()),
    });
  }
}

function updateBloodParticles(
  gfx: Graphics,
  particles: BloodParticle[],
  dt: number,
): BloodParticle[] {
  gfx.clear();
  const remaining: BloodParticle[] = [];
  for (const p of particles) {
    p.life -= dt;
    if (p.life <= 0) continue;
    p.vy += BLOOD_PARTICLE_GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const alpha = Math.max(0, p.life / BLOOD_PARTICLE_LIFETIME);
    gfx.circle(p.x, p.y, p.size);
    gfx.fill({ color: 0xcc0000, alpha });
    remaining.push(p);
  }
  return remaining;
}

// ──────────────────────────────────────────────
//  Spark‑particle helpers
// ──────────────────────────────────────────────

function spawnSparks(particles: SparkParticle[], x: number, y: number) {
  for (let i = 0; i < SPARK_PARTICLE_COUNT; i++) {
    // Sparks radiate in all directions
    const angle = Math.random() * Math.PI * 2;
    const speed = SPARK_PARTICLE_SPEED * (0.3 + Math.random() * 0.7);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - SPARK_PARTICLE_SPEED * 0.3,
      life: SPARK_PARTICLE_LIFETIME * (0.4 + Math.random() * 0.6),
      size: SPARK_PARTICLE_SIZE * (0.5 + Math.random()),
    });
  }
}

function updateSparkParticles(
  gfx: Graphics,
  particles: SparkParticle[],
  dt: number,
): SparkParticle[] {
  gfx.clear();
  const remaining: SparkParticle[] = [];
  for (const p of particles) {
    p.life -= dt;
    if (p.life <= 0) continue;
    p.vy += SPARK_PARTICLE_GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const alpha = Math.max(0, p.life / SPARK_PARTICLE_LIFETIME);
    // Bright yellow core with white-hot center
    const color = Math.random() > 0.3 ? 0xffdd00 : 0xffffff;
    gfx.circle(p.x, p.y, p.size * alpha);
    gfx.fill({ color, alpha });
    remaining.push(p);
  }
  return remaining;
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
}: GameLoopParams) {
  const bloodGfx = useRef<Graphics | null>(null);
  const sparkGfx = useRef<Graphics | null>(null);

  // Phase state machine
  const phase = useRef<Phase>("run");
  const samuraiX = useRef(50);
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

  // Track whether clash spark was emitted for current attack cycle
  const clashSparkEmitted = useRef(false);

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

  // ── Keyboard listener ──

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        // If still running, compute fight positions from screen center
        if (phase.current === "run" || samuraiFightX.current === 0) {
          const cx = app.screen.width / 2;
          samuraiFightX.current = cx - (FRAME_SIZE * CHAR_SCALE) / 2 - MEET_GAP / 2;
          shinobiFightX.current = cx + (FRAME_SIZE * CHAR_SCALE) / 2 + MEET_GAP / 2;
        }
        // Snap both characters to fight positions
        samuraiX.current = samuraiFightX.current;
        shinobiX.current = shinobiFightX.current;
        samuraiKnockback.current = 0;
        shinobiKnockback.current = 0;
        // Enter clash
        phase.current = "clash";
        samuraiFrame.current = 0;
        shinobiFrame.current = 0;
        samuraiElapsed.current = 0;
        shinobiElapsed.current = 0;
        phaseAnimDone.current = false;
        clashSparkEmitted.current = false;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        // Reset to normal battle flow
        phase.current = "shinobi_attack";
        samuraiFrame.current = 0;
        shinobiFrame.current = 0;
        samuraiElapsed.current = 0;
        shinobiElapsed.current = 0;
        phaseAnimDone.current = false;
        clashSparkEmitted.current = false;
        // Move characters back to fight positions
        samuraiX.current = samuraiFightX.current;
        shinobiX.current = shinobiFightX.current;
        samuraiKnockback.current = 0;
        shinobiKnockback.current = 0;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [app.screen.width]);

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
      shinobiX.current = app.screen.width - 50 - FRAME_SIZE * CHAR_SCALE;
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
    const groundY = app.screen.height - FRAME_SIZE * CHAR_SCALE - 20;

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
      const kb = Math.min(samuraiKnockback.current, KNOCKBACK_SPEED * dt);
      samuraiX.current -= kb;
      samuraiKnockback.current -= kb;
    }
    if (shinobiKnockback.current > 0) {
      const kb = Math.min(shinobiKnockback.current, KNOCKBACK_SPEED * dt);
      shinobiX.current += kb;
      shinobiKnockback.current -= kb;
    }

    // ── Phase state machine ──

    const meetDist = FRAME_SIZE * CHAR_SCALE + MEET_GAP;

    switch (curPhase) {
      case "run": {
        samuraiX.current += RUN_SPEED * dt;
        shinobiX.current -= RUN_SPEED * dt;
        if (shinobiX.current - samuraiX.current <= meetDist) {
          const cx = (samuraiX.current + shinobiX.current) / 2;
          samuraiX.current = cx - (FRAME_SIZE * CHAR_SCALE) / 2 - MEET_GAP / 2;
          shinobiX.current = cx + (FRAME_SIZE * CHAR_SCALE) / 2 + MEET_GAP / 2;
          samuraiFightX.current = samuraiX.current;
          shinobiFightX.current = shinobiX.current;
          phase.current = "shinobi_attack";
          resetPhaseFrames();
        }
        break;
      }

      case "shinobi_attack": {
        if (shinobiFrame.current === shinAnim.length - 1 && !phaseAnimDone.current) {
          phaseAnimDone.current = true;
          setTimeout(() => {
            phase.current = "samurai_hurt";
            resetPhaseFrames();
            startShake();
            samuraiKnockback.current = KNOCKBACK_DISTANCE;
            spawnBlood(
              bloodParticles.current,
              samuraiX.current + FRAME_SIZE * CHAR_SCALE * 0.4,
              groundY + FRAME_SIZE * CHAR_SCALE * 0.4,
              -1,
            );
          }, HIT_FREEZE_MS);
        }
        break;
      }

      case "samurai_hurt": {
        if (samuraiFrame.current === samAnim.length - 1 && !phaseAnimDone.current) {
          phaseAnimDone.current = true;
          setTimeout(() => {
            phase.current = "samurai_recover";
            resetPhaseFrames();
          }, HURT_PAUSE_MS);
        }
        break;
      }

      case "samurai_recover": {
        if (samuraiX.current < samuraiFightX.current) {
          samuraiX.current += RECOVER_SPEED * dt;
          if (samuraiX.current >= samuraiFightX.current) {
            samuraiX.current = samuraiFightX.current;
            phase.current = "samurai_idle_wait";
            resetPhaseFrames();
          }
        } else {
          phase.current = "samurai_idle_wait";
          resetPhaseFrames();
        }
        break;
      }

      case "samurai_idle_wait": {
        if (!phaseAnimDone.current) {
          phaseAnimDone.current = true;
          setTimeout(() => {
            phase.current = "samurai_attack";
            resetPhaseFrames();
          }, RECOVER_IDLE_MS);
        }
        break;
      }

      case "samurai_attack": {
        if (samuraiFrame.current === samAnim.length - 1 && !phaseAnimDone.current) {
          phaseAnimDone.current = true;
          setTimeout(() => {
            phase.current = "shinobi_hurt";
            resetPhaseFrames();
            startShake();
            shinobiKnockback.current = KNOCKBACK_DISTANCE;
            spawnBlood(
              bloodParticles.current,
              shinobiX.current + FRAME_SIZE * CHAR_SCALE * 0.4,
              groundY + FRAME_SIZE * CHAR_SCALE * 0.4,
              1,
            );
          }, HIT_FREEZE_MS);
        }
        break;
      }

      case "shinobi_hurt": {
        if (shinobiFrame.current === shinAnim.length - 1 && !phaseAnimDone.current) {
          phaseAnimDone.current = true;
          setTimeout(() => {
            phase.current = "shinobi_recover";
            resetPhaseFrames();
          }, HURT_PAUSE_MS);
        }
        break;
      }

      case "shinobi_recover": {
        if (shinobiX.current > shinobiFightX.current) {
          shinobiX.current -= RECOVER_SPEED * dt;
          if (shinobiX.current <= shinobiFightX.current) {
            shinobiX.current = shinobiFightX.current;
            phase.current = "shinobi_idle_wait";
            resetPhaseFrames();
          }
        } else {
          phase.current = "shinobi_idle_wait";
          resetPhaseFrames();
        }
        break;
      }

      case "shinobi_idle_wait": {
        if (!phaseAnimDone.current) {
          phaseAnimDone.current = true;
          setTimeout(() => {
            phase.current = "shinobi_attack";
            resetPhaseFrames();
          }, RECOVER_IDLE_MS);
        }
        break;
      }

      case "clash": {
        // Waiting between swings — both characters idle
        if (phaseAnimDone.current) break;

        // Both attack simultaneously — emit sparks at the impact frame
        const samImpact = Math.floor(samAnim.length * 0.6);
        const shinImpact = Math.floor(shinAnim.length * 0.6);
        const atImpact =
          samuraiFrame.current >= samImpact ||
          shinobiFrame.current >= shinImpact;

        if (atImpact && !clashSparkEmitted.current) {
          clashSparkEmitted.current = true;
          startShake();
          const clashX = (samuraiX.current + FRAME_SIZE * CHAR_SCALE + shinobiX.current) / 2;
          const clashY = groundY + FRAME_SIZE * CHAR_SCALE * 0.35;
          spawnSparks(sparkParticles.current, clashX, clashY);
        }

        // When both anims complete, pause before next swing
        if (
          samuraiFrame.current === samAnim.length - 1 ||
          shinobiFrame.current === shinAnim.length - 1
        ) {
          phaseAnimDone.current = true;
          setTimeout(() => {
            if (phase.current !== "clash") return; // cancelled
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

    samurai.current.scale.x = CHAR_SCALE;
    samurai.current.anchor.x = 0;

    shinobi.current.scale.x = -CHAR_SCALE;
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
        const intensity = SHAKE_INTENSITY * progress;
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
