import type { Application as PixiApp } from "pixi.js";
import type { Container, Sprite, Texture } from "pixi.js";

import type { CharAnims, LaserFrames } from "../../types";
import type { UseDialGameReturn } from "../types/useDialGame.types";
import type { Layout } from "./useLayout.types";

export interface SceneRefs {
  container: React.RefObject<Container | null>;
  bg: React.RefObject<Sprite | null>;
  player: React.RefObject<Sprite | null>;
  opponent: React.RefObject<Sprite | null>;
  laserSource: React.RefObject<Sprite | null>;
  laserMiddle: React.RefObject<Container | null>;
  laserImpact: React.RefObject<Sprite | null>;
  blueLaserSource: React.RefObject<Sprite | null>;
  blueLaserMiddle: React.RefObject<Container | null>;
  blueLaserImpact: React.RefObject<Sprite | null>;
  ringContainer: React.RefObject<Container | null>;
  katanaContainer: React.RefObject<Container | null>;
  cpuKatanaContainer: React.RefObject<Container | null>;
}

export interface GameLoopParams {
  app: PixiApp;
  refs: SceneRefs;
  bgTexture: Texture;
  laserFrames: LaserFrames | null;
  blueLaserFrames: LaserFrames | null;
  playerAnims: CharAnims | null;
  opponentAnims: CharAnims | null;
  dialGame: UseDialGameReturn;
  layout: Layout;
}
