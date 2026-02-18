// ──────────────────────────────────────────────
//  Core game constants (timing, animation, particles)
//  Pixel sizes for characters/movement are in useLayout.
// ──────────────────────────────────────────────

// --- Character (asset property, not display size) ---
export const FRAME_SIZE = 128;

// --- Animation ---
export const ANIM_SPEED = 0.065;

// --- Screen Shake ---
export const SHAKE_DURATION = 0.08;

// --- Hit / Knockback (timing only) ---
export const HIT_FREEZE_MS = 20;
export const RECOVER_IDLE_MS = 100;
export const HURT_PAUSE_MS = 80;

// --- "FIGHT!" text display ---
export const FIGHT_TEXT_DURATION_MS = 1200;

// --- Blood Particles ---
export const BLOOD_PARTICLE_COUNT = 24;
export const BLOOD_PARTICLE_SPEED = 500;
export const BLOOD_PARTICLE_GRAVITY = 700;
export const BLOOD_PARTICLE_LIFETIME = 0.8;
export const BLOOD_PARTICLE_SIZE = 6;

// --- Spark Particles (clash) ---
export const SPARK_PARTICLE_COUNT = 18;
export const SPARK_PARTICLE_SPEED = 600;
export const SPARK_PARTICLE_GRAVITY = 400;
export const SPARK_PARTICLE_LIFETIME = 0.3;
export const SPARK_PARTICLE_SIZE = 6;
export const CLASH_PAUSE_MS = 400;
