import type { Texture } from "pixi.js";

export type Phase =
  | "intro"
  | "run"
  | "countdown"
  | "idle"
  | "fight_text"
  | "flamejet"
  | "light_charge"
  | "beam"
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

export interface CharAnims {
  Run: Texture[];
  Attack_1: Texture[];
  Flame_jet: Texture[];
  Light_charge: Texture[];
  Hurt: Texture[];
  Idle: Texture[];
  Walk: Texture[];
  Dead: Texture[];
}
