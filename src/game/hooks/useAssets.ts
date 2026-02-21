import { Assets, Rectangle, Texture } from "pixi.js";
import { useEffect, useState } from "react";

import type { CharAnims, LaserFrames } from "../types";
import { ANIM_FRAMES, sliceFrames } from "../utils/sprites";

/** Load and return the battleground background texture. */
export function useBackgroundTexture() {
  const [bgTexture, setBgTexture] = useState(Texture.EMPTY);

  useEffect(() => {
    if (bgTexture === Texture.EMPTY) {
      Assets.load("/Battleground/Battleground.png").then(
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
      Assets.load("/Ring_Texture.png").then(setBricksTexture);
    }
  }, [bricksTexture]);

  return bricksTexture;
}

/** Laser spritesheet: 192×288, 6 rows × 4 cols, each frame 48×48.
 *  Rows 0-1 = source, 2-3 = middle, 4-5 = impact.
 *  Even rows = loop frames, odd rows = start frames. */
const LASER_COLS = 4;
const LASER_FRAME_W = 48;
const LASER_FRAME_H = 48;

/** Load and return laser beam section frames. */
export function useLaserFrames() {
  const [laserFrames, setLaserFrames] = useState<LaserFrames | null>(null);

  useEffect(() => {
    if (!laserFrames) {
      Assets.load("/Laser_Beam_Spritesheet_RED.png").then((sheet: Texture) => {
        const rowFrames = (r: number): Texture[] => {
          const frames: Texture[] = [];
          for (let c = 0; c < LASER_COLS; c++) {
            frames.push(
              new Texture({
                source: sheet.source,
                frame: new Rectangle(
                  c * LASER_FRAME_W, r * LASER_FRAME_H, LASER_FRAME_W, LASER_FRAME_H,
                ),
              }),
            );
          }
          return frames;
        };
        setLaserFrames({
          sourceStart: rowFrames(1),
          sourceLoop: rowFrames(0),
          middleStart: rowFrames(3),
          middleLoop: rowFrames(2),
          impactStart: rowFrames(5),
          impactLoop: rowFrames(4),
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
        const sheet = await Assets.load(`/${charName}/${animName}.png`);
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
