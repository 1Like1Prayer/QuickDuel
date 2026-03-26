import { Rectangle, Texture } from "pixi.js";

import { FRAME_SIZE } from "../constants";

/** Number of animation frames for each character's spritesheet.
 *  Keys are character display names; inner keys are animation names matching filenames. */
export const ANIM_FRAMES: Record<string, Record<string, number>> = {
  "Fire Wizard": { Flame_jet: 5, Hurt: 3, Idle: 7, Dead: 6, Run: 8, Walk: 6 },
  "Wanderer Magician": { Magic_arrow: 6, Hurt: 4, Idle: 8, Dead: 4, Run: 8, Walk: 7 },
};

/** Slice a horizontal spritesheet into individual frame `Texture` objects.
 *  Each frame is `FRAME_SIZE × FRAME_SIZE` pixels, laid out left-to-right. */
export function sliceFrames(sheet: Texture, frameCount: number): Texture[] {
  const frames: Texture[] = [];
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    frames.push(
      new Texture({
        source: sheet.source,
        frame: new Rectangle(frameIndex * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE),
      }),
    );
  }
  return frames;
}

