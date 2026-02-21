import { Assets, Texture } from "pixi.js";
import { useEffect, useState } from "react";

import type { CharAnims } from "../types";
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

    Promise.all([loadAnims("Samurai"), loadAnims("Shinobi")]).then(
      ([player, opponent]) => {
        setPlayerAnims(player);
        setOpponentAnims(opponent);
      },
    );
  }, []);

  return { playerAnims, opponentAnims };
}
