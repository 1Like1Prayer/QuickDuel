import type { Graphics } from "pixi.js";

import {
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
} from "../constants";
import type { BloodParticle } from "../types";

// Reuse BloodParticle shape for sparks (same physics, different color)
export type SparkParticle = BloodParticle;

// ──────────────────────────────────────────────
//  Blood particles
// ──────────────────────────────────────────────

/** Emit blood particles at (x, y). `directionSign` controls spray direction. */
export function spawnBlood(
  particles: BloodParticle[],
  x: number,
  y: number,
  directionSign: number,
): void {
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

/** Advance & draw blood particles. Returns the surviving particles. */
export function updateBloodParticles(
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
//  Spark particles (clash effect)
// ──────────────────────────────────────────────

/** Emit spark particles at (x, y). */
export function spawnSparks(
  particles: SparkParticle[],
  x: number,
  y: number,
): void {
  for (let i = 0; i < SPARK_PARTICLE_COUNT; i++) {
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

/** Advance & draw spark particles. Returns the surviving particles. */
export function updateSparkParticles(
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
    const color = Math.random() > 0.3 ? 0xffdd00 : 0xffffff;
    gfx.circle(p.x, p.y, p.size * alpha);
    gfx.fill({ color, alpha });
    remaining.push(p);
  }
  return remaining;
}
