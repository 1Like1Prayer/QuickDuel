import { Assets, Texture } from "pixi.js";
import { useEffect, useState } from "react";

import type { CharAnims } from "../types";
import { ANIM_FRAMES, sliceFrames } from "../utils/sprites";

/** Load and return the battleground background texture. */
export function useBackgroundTexture() {
  const [bgTexture, setBgTexture] = useState(Texture.EMPTY);

  useEffect(() => {
    if (bgTexture === Texture.EMPTY) {
      Assets.load("/Battleground1/Bright/Battleground1.png").then(
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



/** Load and return both character animation sets. */
export function useCharacterAnims() {
  const [samuraiAnims, setSamuraiAnims] = useState<CharAnims | null>(null);
  const [shinobiAnims, setShinobiAnims] = useState<CharAnims | null>(null);

  useEffect(() => {
    const loadAnims = async (charName: string): Promise<CharAnims> => {
      const anims: Partial<CharAnims> = {};
      for (const animName of [
        "Run",
        "Attack_1",
        "Hurt",
        "Idle",
        "Walk",
      ] as const) {
        const sheet = await Assets.load(`/${charName}/${animName}.png`);
        anims[animName] = sliceFrames(sheet, ANIM_FRAMES[charName][animName]);
      }
      return anims as CharAnims;
    };

    Promise.all([loadAnims("Samurai"), loadAnims("Shinobi")]).then(
      ([samurai, shinobi]) => {
        setSamuraiAnims(samurai);
        setShinobiAnims(shinobi);
      },
    );
  }, []);

  return { samuraiAnims, shinobiAnims };
}
