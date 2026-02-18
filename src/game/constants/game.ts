// ──────────────────────────────────────────────
//  Core game constants (character, movement, combat, particles)
// ──────────────────────────────────────────────

// --- Character ---
export const FRAME_SIZE = 128;
export const CHAR_SCALE = 2;

// --- Movement ---
export const RUN_SPEED = 350;
export const ANIM_SPEED = 0.065;
export const MEET_GAP = -80;
export const RECOVER_SPEED = 450;

// --- Screen Shake ---
export const SHAKE_INTENSITY = 5;
export const SHAKE_DURATION = 0.08;

// --- Hit / Knockback ---
export const HIT_FREEZE_MS = 20;
export const KNOCKBACK_DISTANCE = 30;
export const RECOVER_IDLE_MS = 100;
export const KNOCKBACK_SPEED = 600;
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
