import { Rectangle, Texture } from "pixi.js";

import { FRAME_SIZE } from "../constants";

/** Frame counts per character per animation. */
export const ANIM_FRAMES: Record<string, Record<string, number>> = {
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
