import { Rectangle, Texture } from "pixi.js";

import { FRAME_SIZE } from "../constants";

/** Frame counts per character per animation. */
export const ANIM_FRAMES: Record<string, Record<string, number>> = {
  "Fire Wizard": { Flame_jet: 5, Hurt: 3, Idle: 7, Dead: 6, Run: 8, Walk: 6 },
  "Wanderer Magician": { Magic_arrow: 6, Hurt: 4, Idle: 8, Dead: 4, Run: 8, Walk: 7 },
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

/** Slice a grid spritesheet (left→right, top→bottom) into frame textures. */
export function sliceGridFrames(
  sheet: Texture,
  frameW: number,
  frameH: number,
  cols: number,
  totalFrames: number,
): Texture[] {
  const frames: Texture[] = [];
  for (let i = 0; i < totalFrames; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    frames.push(
      new Texture({
        source: sheet.source,
        frame: new Rectangle(col * frameW, row * frameH, frameW, frameH),
      }),
    );
  }
  return frames;
}
