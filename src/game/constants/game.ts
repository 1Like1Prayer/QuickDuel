// ──────────────────────────────────────────────
//  Core game constants (timing, animation, particles)
//  Pixel sizes for characters/movement are in useLayout.
// ──────────────────────────────────────────────

// --- Character (asset property, not display size) ---
export const FRAME_SIZE = 128;

// --- Animation ---
export const ANIM_SPEED = 0.065;
export const LASER_ANIM_SPEED = 1 / 24;   // 24 fps for laser beam frames

// --- Screen Shake ---
export const SHAKE_DURATION = 0.08;

// --- "FIGHT!" text display ---
export const FIGHT_TEXT_DURATION_MS = 1200;

// --- Countdown (3 → 2 → 1 → FIGHT!) ---
export const COUNTDOWN_STEP_MS = 700;       // ms per number
export const COUNTDOWN_FIGHT_MS = 800;      // ms the "FIGHT!" label stays
export const RING_FADE_IN_DURATION = 1.8;   // seconds for circle/dial fade-in

// --- Win sequence ---
export const SLOWMO_ANIM_SPEED = 0.3;
export const WIN_TEXT_FADE_DURATION = 1.5;

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
