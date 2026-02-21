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

export interface LaserFrames {
  sourceStart: Texture[];
  sourceLoop: Texture[];
  middleStart: Texture[];
  middleLoop: Texture[];
  impactStart: Texture[];
  impactLoop: Texture[];
}
