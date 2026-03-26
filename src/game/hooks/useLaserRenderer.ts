import { Container, Sprite, Texture } from "pixi.js";
import { useRef } from "react";

import { LASER_ANIM_SPEED, WIN_POINTS } from "../constants";
import { useGameStore } from "../../state";
import type { LaserFrames } from "../types";
import type { Layout } from "./types/useLayout.types";
import type { AudioManager } from "./useAudioManager";

export interface LaserRendererState {
  /** Smoothly interpolated x-position where the two beams clash. */
  laserClashPointLerpedX: React.RefObject<number | null>;
  /** Clamped x-position of the red beam's impact sprite (used by blue beam to mirror). */
  redImpactClampedX: React.RefObject<number | null>;
  /** Per-tick update: positions, animates, and tiles both beams. */
  update: (params: LaserUpdateParams) => void;
  /** Reset all animation state (called on game restart). */
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

/** Number of frames in each start / loop row of the laser spritesheet. */
const FRAMES_PER_ROW = 4;

/** Advance a laser through its 4-frame "start" sequence, then cycle the 4-frame "loop". */
function advanceLaserAnimation(
  animTimer: React.MutableRefObject<number>,
  frameIndex: React.MutableRefObject<number>,
  isInLoopPhase: React.MutableRefObject<boolean>,
  dt: number,
) {
  animTimer.current += dt;
  if (animTimer.current >= LASER_ANIM_SPEED) {
    animTimer.current = 0;
    if (!isInLoopPhase.current) {
      // Still playing the one-shot "start" sequence
      frameIndex.current++;
      if (frameIndex.current >= FRAMES_PER_ROW) {
        isInLoopPhase.current = true;
        frameIndex.current = 0;
      }
    } else {
      // Cycling through the repeating "loop" sequence
      frameIndex.current = (frameIndex.current + 1) % FRAMES_PER_ROW;
    }
  }
}

/** Add or remove children in `container` so it has exactly `tileCount` sprites,
 *  then position each tile along a line starting at `originX` with `tileStep` spacing. */
function syncMiddleTiles(
  container: Container,
  tileCount: number,
  texture: Texture,
  originX: number,
  tileStep: number,
  y: number,
  scaleX: number,
  scaleY: number,
) {
  container.visible = true;

  // Grow sprite pool if needed
  while (container.children.length < tileCount) {
    const tile = new Sprite();
    tile.anchor.set(0, 0.5);
    container.addChild(tile);
  }
  // Shrink sprite pool if needed
  while (container.children.length > tileCount) {
    const removed = container.removeChildAt(container.children.length - 1);
    removed.destroy();
  }

  for (let i = 0; i < tileCount; i++) {
    const tile = container.children[i] as Sprite;
    tile.texture = texture;
    tile.x = originX + i * tileStep;
    tile.y = y;
    tile.scale.set(scaleX, scaleY);
  }
}

/** Destroy all children and hide the middle-section container. */
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

  /** Smoothly interpolated clash-point x (shared between both beams). */
  const laserClashPointLerpedX = useRef<number | null>(null);
  /** Red impact sprite's clamped x (used by blue beam to mirror its position). */
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
    const charSize = layout.characters.charSize;
    const isSmallScreen = layout.base.unit < 500;

    // ── Red laser beam (player → right) ─────────────────────
    if (laserFrames) {
      if (shouldShow) {
        redSource.visible = true;
        redMiddle.visible = true;
        redImpact.visible = true;

        audio.startBeamLoops();
        audio.syncBeamLoopMute();

        // Advance animation frame
        advanceLaserAnimation(redAnimTimer, redFrameIndex, redInLoop, dt);

        const currentFrame = redFrameIndex.current;
        const middleTexture = !redInLoop.current
          ? laserFrames.middleStart[currentFrame]
          : laserFrames.middleLoop[currentFrame];

        // Select source/impact textures based on start vs loop phase
        if (!redInLoop.current) {
          redSource.texture = laserFrames.sourceStart[currentFrame];
          redImpact.texture = laserFrames.impactStart[currentFrame];
        } else {
          redSource.texture = laserFrames.sourceLoop[currentFrame];
          redImpact.texture = laserFrames.impactLoop[currentFrame];
        }

        // ── Beam geometry ──
        const spriteFrameWidth = laserFrames.sourceStart[0].width;
        const spriteFrameHeight = laserFrames.sourceStart[0].height;
        /** Scale factor so each beam sprite matches 75% of the character height. */
        const beamScale = (charSize * 0.75) / spriteFrameHeight;
        /** Width of one tile sprite after scaling. */
        const scaledTileWidth = spriteFrameWidth * beamScale;
        /** Vertical centre of the beam (character torso level). */
        const beamY = layout.positions.groundY + charSize * 0.66;

        // ── Source sprite — anchored at the player's casting hand ──
        const sourceX = playerX + charSize * 0.15;
        redSource.x = sourceX;
        redSource.y = beamY;
        redSource.anchor.set(0, 0.5);
        redSource.scale.set(beamScale, beamScale);

        // ── Compute score-driven clash point ──
        /** Normalised score: -1 (opponent winning) → 0 (tied) → +1 (player winning). */
        const scoreNormalized = Math.min(1, Math.max(-1, useGameStore.getState().score / (WIN_POINTS + 1)));
        /** Base width of the travel zone (matches the score bar). */
        const travelZoneBaseWidth = layout.ring.outerRadius * 2;
        /** Responsive multiplier — wider travel zone on larger screens. */
        const travelZoneMultiplier = Math.min(2.2, Math.max(1, layout.base.width / 800));
        const travelZoneHalfWidth = (travelZoneBaseWidth * travelZoneMultiplier) / 2;

        /** Resting x of the clash point when score is 0 (slightly right of meet-point). */
        const clashRestingX = layout.positions.meetX + charSize * (isSmallScreen ? 0.2 : 0.3);
        /** How far the clash can travel per unit of scoreNormalized. */
        const clashTravelScale = isSmallScreen ? 0.8 : 1.5;
        /** Target x the clash point should move toward this frame. */
        const clashTargetX = clashRestingX + travelZoneHalfWidth * scoreNormalized * clashTravelScale;

        // Smooth lerp so the clash slides instead of jumping
        if (laserClashPointLerpedX.current === null) {
          laserClashPointLerpedX.current = clashTargetX;
        } else {
          laserClashPointLerpedX.current += (clashTargetX - laserClashPointLerpedX.current) * 0.06;
        }

        // Clamp so red impact never overlaps its own source or crosses into the blue source
        const redMinImpactX = sourceX + scaledTileWidth * 1.2;
        const blueSourceEdgeX = opponentX + charSize * 0.65;
        const blueMinImpactClamp = blueSourceEdgeX - scaledTileWidth * 0.5;
        const redImpactX = Math.min(blueMinImpactClamp, Math.max(laserClashPointLerpedX.current, redMinImpactX));
        redImpactClampedX.current = redImpactX;

        // ── Impact sprite ──
        redImpact.x = redImpactX;
        redImpact.y = beamY;
        redImpact.anchor.set(1, 0.5);
        redImpact.scale.set(beamScale, beamScale);

        // ── Tiled middle section ──
        const middleStartX = sourceX + scaledTileWidth * 0.3;
        const middleEndX = redImpactX - scaledTileWidth;
        const middleSpan = middleEndX - middleStartX;

        if (middleSpan <= 0) {
          clearMiddleTiles(redMiddle);
        } else {
          const tileStep = scaledTileWidth * 0.3;
          const tileCount = Math.max(1, Math.ceil(middleSpan / tileStep));
          syncMiddleTiles(redMiddle, tileCount, middleTexture, middleStartX, tileStep, beamY, beamScale, beamScale);
        }
        // Source & impact render above the tiled middle
        redMiddle.zIndex = 0;
        redSource.zIndex = 1;
        redImpact.zIndex = 1;
      } else {
        // Hide beam & reset animation
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

    // ── Blue laser beam (opponent → left) ────────────────────
    if (blueSource && blueMiddle && blueImpact && blueLaserFrames) {
      if (shouldShow) {
        blueSource.visible = true;
        blueMiddle.visible = true;
        blueImpact.visible = true;

        // Advance animation frame
        advanceLaserAnimation(blueAnimTimer, blueFrameIndex, blueInLoop, dt);

        const currentFrame = blueFrameIndex.current;
        const middleTexture = !blueInLoop.current
          ? blueLaserFrames.middleStart[currentFrame]
          : blueLaserFrames.middleLoop[currentFrame];

        if (!blueInLoop.current) {
          blueSource.texture = blueLaserFrames.sourceStart[currentFrame];
          blueImpact.texture = blueLaserFrames.impactStart[currentFrame];
        } else {
          blueSource.texture = blueLaserFrames.sourceLoop[currentFrame];
          blueImpact.texture = blueLaserFrames.impactLoop[currentFrame];
        }

        // ── Beam geometry (same formula, different spritesheet) ──
        const spriteFrameWidth = blueLaserFrames.sourceStart[0].width;
        const spriteFrameHeight = blueLaserFrames.sourceStart[0].height;
        const beamScale = (charSize * 0.75) / spriteFrameHeight;
        const scaledTileWidth = spriteFrameWidth * beamScale;
        const beamY = layout.positions.groundY + charSize * 0.66;

        // ── Source sprite — anchored at the opponent's casting hand (flipped) ──
        const sourceX = opponentX + charSize * 0.65;
        blueSource.x = sourceX;
        blueSource.y = beamY;
        blueSource.anchor.set(0, 0.5);
        blueSource.scale.set(-beamScale, beamScale); // negative scaleX = mirrored

        // ── Mirror the red beam's clash-point for the blue impact position ──
        /** Blue beam's resting impact x (slightly left of meet-point). */
        const blueClashRestingX = layout.positions.meetX - charSize * (isSmallScreen ? 0.31 : 0.21);
        /** Red beam's resting impact x (for calculating the offset). */
        const redClashRestingX = layout.positions.meetX + charSize * (isSmallScreen ? 0.2 : 0.3);
        /** Use the red impact's actual position to compute how far the clash shifted. */
        const effectiveRedImpactX = redImpactClampedX.current ?? laserClashPointLerpedX.current ?? layout.positions.meetX;
        const clashShift = effectiveRedImpactX - redClashRestingX;
        const unclampedBlueImpactX = blueClashRestingX + clashShift;

        // Clamp so blue impact never crosses past its own source
        const blueMinImpactX = sourceX - scaledTileWidth * 1.2;
        const blueImpactX = Math.min(unclampedBlueImpactX, blueMinImpactX);

        // ── Impact sprite (flipped) ──
        blueImpact.x = blueImpactX;
        blueImpact.y = beamY;
        blueImpact.anchor.set(1, 0.5);
        blueImpact.scale.set(-beamScale, beamScale);

        // ── Tiled middle section (right-to-left) ──
        const middleStartX = sourceX - scaledTileWidth * 0.3;
        const middleEndX = blueImpactX + scaledTileWidth;
        const middleSpan = middleStartX - middleEndX;

        if (middleSpan <= 0) {
          clearMiddleTiles(blueMiddle);
        } else {
          const tileStep = scaledTileWidth * 0.3;
          const tileCount = Math.max(1, Math.ceil(middleSpan / tileStep));
          syncMiddleTiles(blueMiddle, tileCount, middleTexture, middleStartX, -tileStep, beamY, -beamScale, beamScale);
        }
        blueMiddle.zIndex = 0;
        blueSource.zIndex = 1;
        blueImpact.zIndex = 1;
      } else {
        // Hide beam & reset animation
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
