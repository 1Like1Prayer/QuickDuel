import { Container, Sprite, Texture } from "pixi.js";

import type { LaserFrames } from "../../types";

export interface LaserBeamProps {
  frames: LaserFrames | null;
  sourceRef: React.RefObject<Sprite | null>;
  middleRef: React.RefObject<Container | null>;
  impactRef: React.RefObject<Sprite | null>;
}

/** A 3-section laser beam: source, tiled middle, impact. */
export function LaserBeam({ frames, sourceRef, middleRef, impactRef }: LaserBeamProps) {
  return (
    <>
      <pixiSprite
        ref={sourceRef}
        texture={frames ? frames.sourceStart[0] : Texture.EMPTY}
        visible={false}
        anchor={{ x: 0, y: 0.5 }}
      />
      <pixiContainer ref={middleRef} visible={false} />
      <pixiSprite
        ref={impactRef}
        texture={frames ? frames.impactStart[0] : Texture.EMPTY}
        visible={false}
        anchor={{ x: 0, y: 0.5 }}
      />
    </>
  );
}
