import type { Texture } from "pixi.js";

export type Phase =
  | "intro"
  | "countdown"
  | "attack_intro"
  | "idle"
  | "fight_text"
  | "opponent_attack"
  | "player_hurt"
  | "player_idle_wait"
  | "player_attack"
  | "opponent_hurt"
  | "opponent_idle_wait"
  | "clash"
  | "player_win"
  | "player_lose";

export interface BloodParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

export type CharAnims = Record<string, Texture[]>;

/** Laser beam frames: source, middle, and impact sections. */
export interface LaserFrames {
  /** [startFrame, loopFrame] for the origin/source section */
  source: [Texture, Texture];
  /** [startFrame, loopFrame] for the middle/body section */
  middle: [Texture, Texture];
  /** [startFrame, loopFrame] for the impact/hit section */
  impact: [Texture, Texture];
}
