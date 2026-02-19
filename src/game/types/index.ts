import type { Texture } from "pixi.js";

export type Phase =
  | "intro"
  | "run"
  | "idle"
  | "fight_text"
  | "shinobi_attack"
  | "samurai_hurt"
  | "samurai_recover"
  | "samurai_idle_wait"
  | "samurai_attack"
  | "shinobi_hurt"
  | "shinobi_recover"
  | "shinobi_idle_wait"
  | "clash"
  | "player_win";

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
  Hurt: Texture[];
  Idle: Texture[];
  Walk: Texture[];
  Dead: Texture[];
}
