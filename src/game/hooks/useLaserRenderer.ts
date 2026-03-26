import { Container, Sprite, Texture } from "pixi.js";
import { useRef } from "react";

import { LASER_ANIM_SPEED, WIN_POINTS } from "../constants";
import { useGameStore } from "../../state";
import type { LaserFrames } from "../types";
import type { Layout } from "./types/useLayout.types";
import type { AudioManager } from "./useAudioManager";

export interface LaserRendererState {
  laserClashPointLerpedX: React.RefObject<number | null>;
  redImpactClampedX: React.RefObject<number | null>;
  update: (params: LaserUpdateParams) => void;
  reset: () => void;
}

export interface LaserUpdateParams {
  dt: number;
  shouldShow: boolean;
  playerX: number;
  opponentX: number;
  redSource: Sprite;
  redMiddle: Container;
  redImpact: Sprite;
  blueSource: Sprite | null;
  blueMiddle: Container | null;
  blueImpact: Sprite | null;
}

/** Advance a laser's frame animation (4-frame start → 4-frame loop). */
function advanceLaserAnim(
  timer: React.MutableRefObject<number>,
  frameIdx: React.MutableRefObject<number>,
  inLoop: React.MutableRefObject<boolean>,
  dt: number,
) {
  timer.current += dt;
  if (timer.current >= LASER_ANIM_SPEED) {
    timer.current = 0;
    if (!inLoop.current) {
      frameIdx.current++;
      if (frameIdx.current >= 4) {
        inLoop.current = true;
        frameIdx.current = 0;
      }
    } else {
      frameIdx.current = (frameIdx.current + 1) % 4;
    }
  }
}

/** Sync the tile count of a middle container to match the required span. */
function syncMiddleTiles(
  container: Container,
  tileCount: number,
  texture: Texture,
  startX: number,
  step: number,
  y: number,
  scaleX: number,
  scaleY: number,
) {
  container.visible = true;
  while (container.children.length < tileCount) {
    const s = new Sprite();
    s.anchor.set(0, 0.5);
    container.addChild(s);
  }
  while (container.children.length > tileCount) {
    const removed = container.removeChildAt(container.children.length - 1);
    removed.destroy();
  }
  for (let i = 0; i < tileCount; i++) {
    const s = container.children[i] as Sprite;
    s.texture = texture;
    s.x = startX + i * step;
    s.y = y;
    s.scale.set(scaleX, scaleY);
  }
}

/** Clear all children from a middle container. */
function clearMiddleTiles(container: Container) {
  container.visible = false;
  while (container.children.length > 0) {
    const removed = container.removeChildAt(container.children.length - 1);
    removed.destroy();
  }
}

/** Manages both red and blue laser beam animation, positioning, and tiling. */
export function useLaserRenderer(
  laserFrames: LaserFrames | null,
  blueLaserFrames: LaserFrames | null,
  layout: Layout,
  audio: AudioManager,
): LaserRendererState {
  // Red laser animation state
  const redFrameIndex = useRef(0);
  const redAnimTimer = useRef(0);
  const redInLoop = useRef(false);

  // Blue laser animation state
  const blueFrameIndex = useRef(0);
  const blueAnimTimer = useRef(0);
  const blueInLoop = useRef(false);

  // Shared clash point
  const laserClashPointLerpedX = useRef<number | null>(null);
  const redImpactClampedX = useRef<number | null>(null);

  const update = ({
    dt,
    shouldShow,
    playerX,
    opponentX,
    redSource,
    redMiddle,
    redImpact,
    blueSource,
    blueMiddle,
    blueImpact,
  }: LaserUpdateParams) => {
    // ── Red laser beam (player → right) ──
    if (laserFrames) {
      if (shouldShow) {
        redSource.visible = true;
        redMiddle.visible = true;
        redImpact.visible = true;

        audio.startBeamLoops();
        audio.syncBeamLoopMute();

        advanceLaserAnim(redAnimTimer, redFrameIndex, redInLoop, dt);

        const fi = redFrameIndex.current;
        const middleTex = !redInLoop.current
          ? laserFrames.middleStart[fi]
          : laserFrames.middleLoop[fi];

        if (!redInLoop.current) {
          redSource.texture = laserFrames.sourceStart[fi];
          redImpact.texture = laserFrames.impactStart[fi];
        } else {
          redSource.texture = laserFrames.sourceLoop[fi];
          redImpact.texture = laserFrames.impactLoop[fi];
        }

        const charSize = layout.characters.charSize;
        const frameW = laserFrames.sourceStart[0].width;
        const frameH = laserFrames.sourceStart[0].height;
        const beamH = charSize * 0.75;
        const beamScale = beamH / frameH;
        const scaledTileW = frameW * beamScale;
        const beamY = layout.positions.groundY + charSize * 0.66;

        const srcX = playerX + charSize * 0.15;
        redSource.x = srcX;
        redSource.y = beamY;
        redSource.anchor.set(0, 0.5);
        redSource.scale.set(beamScale, beamScale);

        // Impact target based on score
        const isSmall = layout.base.unit < 500;
        const scoreNorm = Math.min(1, Math.max(-1, useGameStore.getState().score / (WIN_POINTS + 1)));
        const barBaseW = layout.ring.outerRadius * 2;
        const barMult = Math.min(2.2, Math.max(1, layout.base.width / 800));
        const barHalfW = (barBaseW * barMult) / 2;
        const impactBaseX = layout.positions.meetX + charSize * (isSmall ? 0.2 : 0.3);
        const travelMult = isSmall ? 0.8 : 1.5;
        const impactTargetX = impactBaseX + barHalfW * scoreNorm * travelMult;

        if (laserClashPointLerpedX.current === null) {
          laserClashPointLerpedX.current = impactTargetX;
        } else {
          laserClashPointLerpedX.current += (impactTargetX - laserClashPointLerpedX.current) * 0.06;
        }

        const minEndX = srcX + scaledTileW * 1.2;
        const blueSourceXClamp = opponentX + charSize * 0.65;
        const blueMinEndClamp = blueSourceXClamp - scaledTileW * 0.5;
        const impactLerpedX = Math.min(blueMinEndClamp, Math.max(laserClashPointLerpedX.current, minEndX));
        redImpactClampedX.current = impactLerpedX;

        redImpact.x = impactLerpedX;
        redImpact.y = beamY;
        redImpact.anchor.set(1, 0.5);
        redImpact.scale.set(beamScale, beamScale);

        // Tiled middle
        const midStartX = srcX + scaledTileW * 0.3;
        const midEndX = impactLerpedX - scaledTileW;
        const midSpan = midEndX - midStartX;

        if (midSpan <= 0) {
          clearMiddleTiles(redMiddle);
        } else {
          const step = scaledTileW * 0.3;
          const count = Math.max(1, Math.ceil(midSpan / step));
          syncMiddleTiles(redMiddle, count, middleTex, midStartX, step, beamY, beamScale, beamScale);
        }
        redMiddle.zIndex = 0;
        redSource.zIndex = 1;
        redImpact.zIndex = 1;
      } else {
        redSource.visible = false;
        redMiddle.visible = false;
        redImpact.visible = false;
        redFrameIndex.current = 0;
        redAnimTimer.current = 0;
        redInLoop.current = false;
        laserClashPointLerpedX.current = null;
        audio.stopBeamLoops();
      }
    }

    // ── Blue laser beam (opponent → left) ──
    if (blueSource && blueMiddle && blueImpact && blueLaserFrames) {
      if (shouldShow) {
        blueSource.visible = true;
        blueMiddle.visible = true;
        blueImpact.visible = true;

        advanceLaserAnim(blueAnimTimer, blueFrameIndex, blueInLoop, dt);

        const fi = blueFrameIndex.current;
        const middleTex = !blueInLoop.current
          ? blueLaserFrames.middleStart[fi]
          : blueLaserFrames.middleLoop[fi];

        if (!blueInLoop.current) {
          blueSource.texture = blueLaserFrames.sourceStart[fi];
          blueImpact.texture = blueLaserFrames.impactStart[fi];
        } else {
          blueSource.texture = blueLaserFrames.sourceLoop[fi];
          blueImpact.texture = blueLaserFrames.impactLoop[fi];
        }

        const charSize = layout.characters.charSize;
        const frameW = blueLaserFrames.sourceStart[0].width;
        const frameH = blueLaserFrames.sourceStart[0].height;
        const beamH = charSize * 0.75;
        const bScale = beamH / frameH;
        const scaledTileW = frameW * bScale;
        const beamY = layout.positions.groundY + charSize * 0.66;

        const srcX = opponentX + charSize * 0.65;
        blueSource.x = srcX;
        blueSource.y = beamY;
        blueSource.anchor.set(0, 0.5);
        blueSource.scale.set(-bScale, bScale);

        const isSmall = layout.base.unit < 500;
        const impactBaseX = layout.positions.meetX - charSize * (isSmall ? 0.31 : 0.21);
        const redBaseImpactX = layout.positions.meetX + charSize * (isSmall ? 0.2 : 0.3);
        const effectiveRedX = redImpactClampedX.current ?? laserClashPointLerpedX.current ?? layout.positions.meetX;
        const shift = effectiveRedX - redBaseImpactX;
        const unclampedX = impactBaseX + shift;
        const minEndX = srcX - scaledTileW * 1.2;
        const impactLerpedX = Math.min(unclampedX, minEndX);

        blueImpact.x = impactLerpedX;
        blueImpact.y = beamY;
        blueImpact.anchor.set(1, 0.5);
        blueImpact.scale.set(-bScale, bScale);

        const midStartX = srcX - scaledTileW * 0.3;
        const midEndX = impactLerpedX + scaledTileW;
        const midSpan = midStartX - midEndX;

        if (midSpan <= 0) {
          clearMiddleTiles(blueMiddle);
        } else {
          const step = scaledTileW * 0.3;
          const count = Math.max(1, Math.ceil(midSpan / step));
          syncMiddleTiles(blueMiddle, count, middleTex, midStartX, -step, beamY, -bScale, bScale);
        }
        blueMiddle.zIndex = 0;
        blueSource.zIndex = 1;
        blueImpact.zIndex = 1;
      } else {
        blueSource.visible = false;
        blueMiddle.visible = false;
        blueImpact.visible = false;
        blueFrameIndex.current = 0;
        blueAnimTimer.current = 0;
        blueInLoop.current = false;
      }
    }
  };

  const reset = () => {
    redFrameIndex.current = 0;
    redAnimTimer.current = 0;
    redInLoop.current = false;
    blueFrameIndex.current = 0;
    blueAnimTimer.current = 0;
    blueInLoop.current = false;
    laserClashPointLerpedX.current = null;
    redImpactClampedX.current = null;
  };

  return { laserClashPointLerpedX, redImpactClampedX, update, reset };
}
