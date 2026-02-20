import { Rectangle, Texture } from "pixi.js";

import { FRAME_SIZE } from "../constants";

/** Frame counts per character per animation. */
export const ANIM_FRAMES: Record<string, Record<string, number>> = {
  "Fire Wizard": { Run: 8, Attack_1: 4, Flame_jet: 14, Hurt: 3, Idle: 7, Walk: 6, Dead: 6 },
  "Lightning Mage": { Run: 8, Attack_1: 10, Light_charge: 13, Hurt: 3, Idle: 7, Walk: 7, Dead: 5 },
  Samurai: { Run: 8, Attack_1: 6, Hurt: 2, Idle: 6, Walk: 8, Dead: 3 },
  Shinobi: { Run: 8, Attack_1: 5, Hurt: 2, Idle: 6, Walk: 8, Dead: 4 },
};

/** Slice a horizontal spritesheet into individual frame textures. */
export function sliceFrames(sheet: Texture, count: number): Texture[] {
  const frames: Texture[] = [];
  for (let i = 0; i < count; i++) {
    frames.push(
      new Texture({
        source: sheet.source,
        frame: new Rectangle(i * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE),
      }),
    );
  }
  return frames;
}

/** Laser sprite sheet constants. */
export const LASER_COLS = 9;
export const LASER_ROW_HEIGHT = 128;
export const LASER_FRAME_WIDTH = 128;

/**
 * Slice a single row from the laser sprite sheet (1-indexed row number).
 * Each row has LASER_COLS frames of LASER_FRAME_WIDTH × LASER_ROW_HEIGHT.
 */
export function sliceLaserRow(sheet: Texture, row: number): Texture[] {
  const frames: Texture[] = [];
  const y = (row - 1) * LASER_ROW_HEIGHT;
  for (let i = 0; i < LASER_COLS; i++) {
    frames.push(
      new Texture({
        source: sheet.source,
        frame: new Rectangle(i * LASER_FRAME_WIDTH, y, LASER_FRAME_WIDTH, LASER_ROW_HEIGHT),
      }),
    );
  }
  return frames;
}
