import type { Application as PixiApp } from "pixi.js";
import type { Container, Sprite, Texture } from "pixi.js";

import type { CharAnims } from "../../types";
import type { UseDialGameReturn } from "../types/useDialGame.types";
import type { Layout } from "./useLayout.types";

export interface SceneRefs {
  container: React.RefObject<Container | null>;
  bg: React.RefObject<Sprite | null>;
  samurai: React.RefObject<Sprite | null>;
  shinobi: React.RefObject<Sprite | null>;
}

export interface GameLoopParams {
  app: PixiApp;
  refs: SceneRefs;
  bgTexture: Texture;
  samuraiAnims: CharAnims | null;
  shinobiAnims: CharAnims | null;
  dialGame: UseDialGameReturn;
  showFightText: React.RefObject<boolean>;
  layout: Layout;
}
