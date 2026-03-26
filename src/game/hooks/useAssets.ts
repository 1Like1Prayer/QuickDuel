import { Assets, Rectangle, Texture } from "pixi.js";
import { useEffect, useState } from "react";

import type { CharAnims, LaserFrames } from "../types";
import { ANIM_FRAMES, sliceFrames } from "../utils";

/** Load and return the battleground background texture. */
export function useBackgroundTexture() {
  const [bgTexture, setBgTexture] = useState(Texture.EMPTY);

  useEffect(() => {
    if (bgTexture === Texture.EMPTY) {
      Assets.load("/textures/Battleground/Battleground.png").then(
        setBgTexture,
      );
    }
  }, [bgTexture]);

  return bgTexture;
}

/** Load and return the bricks texture. */
export function useBricksTexture() {
  const [bricksTexture, setBricksTexture] = useState(Texture.EMPTY);

  useEffect(() => {
    if (bricksTexture === Texture.EMPTY) {
      Assets.load("/textures/Ring_Texture.png").then(setBricksTexture);
    }
  }, [bricksTexture]);

  return bricksTexture;
}

/** Laser spritesheet layout: 192×288 px, 6 rows × 4 columns, each frame 48×48 px.
 *
 *  | Row | Content         | Usage      |
 *  |-----|-----------------|------------|
 *  | 0   | source loop     | repeating  |
 *  | 1   | source start    | one-shot   |
 *  | 2   | middle loop     | repeating  |
 *  | 3   | middle start    | one-shot   |
 *  | 4   | impact loop     | repeating  |
 *  | 5   | impact start    | one-shot   |
 */
const LASER_COLUMNS_PER_ROW = 4;
const LASER_FRAME_WIDTH = 48;
const LASER_FRAME_HEIGHT = 48;

/** Extract all frame textures for a single row of a laser spritesheet. */
function extractRowFrames(sheet: Texture, rowIndex: number): Texture[] {
  const frames: Texture[] = [];
  for (let columnIndex = 0; columnIndex < LASER_COLUMNS_PER_ROW; columnIndex++) {
    frames.push(
      new Texture({
        source: sheet.source,
        frame: new Rectangle(
          columnIndex * LASER_FRAME_WIDTH,
          rowIndex * LASER_FRAME_HEIGHT,
          LASER_FRAME_WIDTH,
          LASER_FRAME_HEIGHT,
        ),
      }),
    );
  }
  return frames;
}

/** Load and return red laser beam section frames (for the player). */
export function useLaserFrames() {
  const [laserFrames, setLaserFrames] = useState<LaserFrames | null>(null);

  useEffect(() => {
    if (!laserFrames) {
      Assets.load("/lasers/Laser_Beam_Spritesheet_RED.png").then((sheet: Texture) => {
        setLaserFrames({
          sourceStart: extractRowFrames(sheet, 1),
          sourceLoop: extractRowFrames(sheet, 0),
          middleStart: extractRowFrames(sheet, 3),
          middleLoop: extractRowFrames(sheet, 2),
          impactStart: extractRowFrames(sheet, 5),
          impactLoop: extractRowFrames(sheet, 4),
        });
      });
    }
  }, [laserFrames]);

  return laserFrames;
}

/** Load and return blue laser beam section frames (for the opponent). */
export function useBlueLaserFrames() {
  const [laserFrames, setLaserFrames] = useState<LaserFrames | null>(null);

  useEffect(() => {
    if (!laserFrames) {
      Assets.load("/lasers/Laser_Beam_Spritesheet_BLUE.png").then((sheet: Texture) => {
        setLaserFrames({
          sourceStart: extractRowFrames(sheet, 1),
          sourceLoop: extractRowFrames(sheet, 0),
          middleStart: extractRowFrames(sheet, 3),
          middleLoop: extractRowFrames(sheet, 2),
          impactStart: extractRowFrames(sheet, 5),
          impactLoop: extractRowFrames(sheet, 4),
        });
      });
    }
  }, [laserFrames]);

  return laserFrames;
}

/** Load and return both character animation sets. */
export function useCharacterAnims() {
  const [playerAnims, setPlayerAnims] = useState<CharAnims | null>(null);
  const [opponentAnims, setOpponentAnims] = useState<CharAnims | null>(null);

  useEffect(() => {
    const loadAnims = async (charName: string): Promise<CharAnims> => {
      const anims: CharAnims = {};
      for (const [animName, frameCount] of Object.entries(ANIM_FRAMES[charName])) {
        const sheet = await Assets.load(`/characters/${charName}/${animName}.png`);
        anims[animName] = sliceFrames(sheet, frameCount);
      }
      return anims;
    };

    Promise.all([loadAnims("Fire Wizard"), loadAnims("Wanderer Magician")]).then(
      ([player, opponent]) => {
        setPlayerAnims(player);
        setOpponentAnims(opponent);
      },
    );
  }, []);

  return { playerAnims, opponentAnims };
}
