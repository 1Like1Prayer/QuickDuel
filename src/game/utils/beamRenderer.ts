import { Graphics } from "pixi.js";

/* ─────────────────────────────────────────────────────────
 *  BeamState – mutable per-beam state carried between frames
 * ───────────────────────────────────────────────────────── */

export interface BeamState {
  /** Accumulated time (seconds) – drives all oscillations */
  elapsed: number;
  /** Beam extension 0→1 (origin → full length) */
  reach: number;
  /** Whether the beam has finished its launch animation */
  launched: boolean;
}

export function createBeamState(): BeamState {
  return { elapsed: 0, reach: 0, launched: false };
}

export function resetBeamState(s: BeamState): void {
  s.elapsed = 0;
  s.reach = 0;
  s.launched = false;
}

/* ─────────────────────────────────────────────────────────
 *  BeamConfig – per-beam colour palette
 * ───────────────────────────────────────────────────────── */

export interface BeamConfig {
  /** Deep saturated colour (aura / outer glow) */
  aura: number;
  /** Saturated core colour */
  core: number;
  /** Bright centre / head highlight (near-white tint) */
  bright: number;
}

export const RED_BEAM_CONFIG: BeamConfig = {
  aura: 0x660800,
  core: 0xcc2200,
  bright: 0xff7722,
};

export const BLUE_BEAM_CONFIG: BeamConfig = {
  aura: 0x061844,
  core: 0x0d4499,
  bright: 0x4499ee,
};

/* ─────────────────────────────────────────────────────────
 *  Tuning constants
 * ───────────────────────────────────────────────────────── */

const LAUNCH_SPEED = 4.0;        // units/s for reach (0→1)
const BODY_SEGMENTS = 32;         // poly segments along beam body
const HEAD_SPIKE_COUNT = 18;      // jagged spikes on the head orb
const HEAD_SPIKE_SPEED = 12;      // spike flicker speed (rad/s)
const ENERGY_SCROLL_SPEED = 14;   // apparent energy-flow speed along beam
const PULSE_SPEED = 7;            // global brightness pulse speed

/* Simple deterministic noise (no dependencies). */
function noise(x: number): number {
  const s = Math.sin(x * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/* ─────────────────────────────────────────────────────────
 *  drawBeam – render one frame of the plasma beam
 *
 *  The glowing head orb sits at the ORIGIN (caster's hands).
 *  The beam body extends outward from the origin toward the
 *  impact / clash point.
 * ───────────────────────────────────────────────────────── */

// eslint-disable-next-line max-params
export function drawBeam(
  gfx: Graphics,
  state: BeamState,
  cfg: BeamConfig,
  ox: number,   // origin X (caster's hand) — where the head orb sits
  oy: number,   // origin Y
  tx: number,   // target / impact X
  ty: number,   // target / impact Y
  halfH: number, // half-thickness of the beam tube
  dt: number,
): void {
  gfx.clear();
  state.elapsed += dt;

  // Advance beam reach
  if (!state.launched) {
    state.reach = Math.min(1, state.reach + dt * LAUNCH_SPEED);
    if (state.reach >= 1) state.launched = true;
  }

  const t = state.elapsed;
  const reach = state.reach;

  // Direction
  const dx = tx - ox;
  const dy = ty - oy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;

  // Unit vectors: along beam and perpendicular
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;   // perp X
  const py = ux;    // perp Y

  // Current end position of the beam body (extends outward from origin)
  const endX = ox + dx * reach;
  const endY = oy + dy * reach;
  const bodyLen = len * reach;

  // Global brightness flicker (noise-based)
  const flicker = 0.85 + 0.15 * Math.sin(t * PULSE_SPEED)
                + 0.05 * noise(t * 3.1);

  // Beam thickness oscillation
  const thickOsc = 1 + 0.04 * Math.sin(t * 9) + 0.02 * Math.sin(t * 17.3);

  /* ── Helper: wavy offset at fraction f along beam ── */
  const waveAt = (f: number): number => {
    const scrollPhase = f * 20 - t * ENERGY_SCROLL_SPEED;
    return (
      Math.sin(scrollPhase) * halfH * 0.06 +
      Math.sin(scrollPhase * 2.3 + 1.1) * halfH * 0.03
    );
  };

  // Head orb radius (at origin)
  const headR = halfH * (2.2 + 0.4 * Math.sin(t * 8) + 0.2 * Math.sin(t * 13.7));
  // The beam body starts a bit ahead of the origin (after the head orb)
  const bodyStartOffset = headR * 0.4; // beam body begins just past the orb edge

  /* ══════════════════════════════════════════════════
   *  1. OUTER AURA  (soft, wide, transparent glow around the beam body)
   * ══════════════════════════════════════════════════ */
  {
    const auraW = halfH * 2.2 * thickOsc;
    const auraAlpha = (0.10 + 0.03 * Math.sin(t * 5)) * flicker;

    // Start from the body start offset
    const bsX = ox + ux * bodyStartOffset;
    const bsY = oy + uy * bodyStartOffset;
    gfx.moveTo(bsX + px * halfH * 0.5, bsY + py * halfH * 0.5);

    for (let i = 1; i <= BODY_SEGMENTS; i++) {
      const f = i / BODY_SEGMENTS;
      if (f > reach) break;
      const bx = ox + dx * f;
      const by = oy + dy * f;
      const w = waveAt(f);
      // Widen quickly from body start (short cone)
      const distFromStart = f * len - bodyStartOffset;
      const widthFrac = Math.min(1, Math.max(0, distFromStart / (len * 0.04)));
      const h = auraW * widthFrac + w;
      gfx.lineTo(bx + px * h, by + py * h);
    }

    // End cap
    gfx.lineTo(endX + px * auraW, endY + py * auraW);
    gfx.lineTo(endX + ux * halfH * 0.5, endY + uy * halfH * 0.5);
    gfx.lineTo(endX - px * auraW, endY - py * auraW);

    // Bottom edge back
    for (let i = BODY_SEGMENTS; i >= 1; i--) {
      const f = i / BODY_SEGMENTS;
      if (f > reach) continue;
      const bx = ox + dx * f;
      const by = oy + dy * f;
      const w = waveAt(f);
      const distFromStart = f * len - bodyStartOffset;
      const widthFrac = Math.min(1, Math.max(0, distFromStart / (len * 0.04)));
      const h = auraW * widthFrac + w * 0.7;
      gfx.lineTo(bx - px * h, by - py * h);
    }

    gfx.lineTo(bsX - px * halfH * 0.5, bsY - py * halfH * 0.5);
    gfx.closePath();
    gfx.fill({ color: cfg.aura, alpha: auraAlpha });
  }

  /* ══════════════════════════════════════════════════
   *  2. CORE BODY  (solid, consistent thickness)
   * ══════════════════════════════════════════════════ */
  {
    const coreH = halfH * thickOsc;
    const coreAlpha = (0.85 + 0.1 * Math.sin(t * 6)) * flicker;

    const bsX = ox + ux * bodyStartOffset;
    const bsY = oy + uy * bodyStartOffset;
    gfx.moveTo(bsX + px * halfH * 0.15, bsY + py * halfH * 0.15);

    // Top edge
    for (let i = 1; i <= BODY_SEGMENTS; i++) {
      const f = i / BODY_SEGMENTS;
      if (f > reach) break;
      const bx = ox + dx * f;
      const by = oy + dy * f;
      const w = waveAt(f);
      const distFromStart = f * len - bodyStartOffset;
      const widthFrac = Math.min(1, Math.max(0, distFromStart / (len * 0.03)));
      const h = coreH * widthFrac + w;
      gfx.lineTo(bx + px * h, by + py * h);
    }

    // Round off at the end
    gfx.lineTo(endX + px * coreH, endY + py * coreH);
    gfx.lineTo(endX - px * coreH, endY - py * coreH);

    // Bottom edge back
    for (let i = BODY_SEGMENTS; i >= 1; i--) {
      const f = i / BODY_SEGMENTS;
      if (f > reach) continue;
      const bx = ox + dx * f;
      const by = oy + dy * f;
      const w = waveAt(f);
      const distFromStart = f * len - bodyStartOffset;
      const widthFrac = Math.min(1, Math.max(0, distFromStart / (len * 0.03)));
      const h = coreH * widthFrac + w * 0.8;
      gfx.lineTo(bx - px * h, by - py * h);
    }

    gfx.lineTo(bsX - px * halfH * 0.15, bsY - py * halfH * 0.15);
    gfx.closePath();
    gfx.fill({ color: cfg.core, alpha: coreAlpha });
  }

  /* ══════════════════════════════════════════════════
   *  3. BRIGHT CENTRE LINE  (energy flow along body)
   * ══════════════════════════════════════════════════ */
  {
    const lineW = Math.max(1.5, halfH * 0.4);
    const lineAlpha = (0.55 + 0.2 * Math.sin(t * 11)) * flicker;

    const bsX = ox + ux * bodyStartOffset;
    const bsY = oy + uy * bodyStartOffset;
    gfx.moveTo(bsX, bsY);

    for (let i = 1; i <= BODY_SEGMENTS; i++) {
      const f = i / BODY_SEGMENTS;
      if (f > reach) break;
      const bx = ox + dx * f;
      const by = oy + dy * f;
      const w = waveAt(f) * 0.4;
      gfx.lineTo(bx + px * w, by + py * w);
    }
    gfx.stroke({ color: cfg.bright, width: lineW, alpha: lineAlpha });
  }

  /* ══════════════════════════════════════════════════
   *  4. ENERGY FLOW WISPS  (scrolling bright dashes along body)
   * ══════════════════════════════════════════════════ */
  if (bodyLen > 10) {
    const wispCount = 6;
    const wispLen = bodyLen * 0.08;
    const wispAlpha = 0.3 * flicker;

    for (let w = 0; w < wispCount; w++) {
      const phase = (w / wispCount + t * 0.8) % 1;
      if (phase > reach) continue;

      const startF = phase;
      const endF = Math.min(reach, phase + wispLen / bodyLen);
      if (endF <= startF) continue;

      const sx = ox + dx * startF;
      const sy = oy + dy * startF;
      const ex = ox + dx * endF;
      const ey = oy + dy * endF;

      gfx.moveTo(sx, sy);
      gfx.lineTo(ex, ey);
      gfx.stroke({
        color: cfg.bright,
        width: Math.max(1, halfH * 0.25),
        alpha: wispAlpha * (1 - Math.abs(phase - 0.5) * 2),
      });
    }
  }

  /* ══════════════════════════════════════════════════
   *  5. HEAD ORB  (at the ORIGIN / caster's hands)
   *     Solid comet-like shape with directional spikes.
   *     No outer glow wrapper — just the orb itself.
   * ══════════════════════════════════════════════════ */
  {
    // Beam direction angle (used to bias spikes forward)
    const beamAngle = Math.atan2(uy, ux);

    // Main solid head orb with directional jagged spikes
    // Spikes facing forward (in beam direction) are taller and sharper
    {
      const spikeSegs = HEAD_SPIKE_COUNT * 2; // intermediate points for smoother shape
      for (let i = 0; i <= spikeSegs; i++) {
        const a = (i / spikeSegs) * Math.PI * 2;

        // Forward alignment: cos of angle difference with beam direction
        const fwdDot = Math.cos(a - beamAngle);
        const fwdFactor = Math.max(0, fwdDot); // 0→1 for forward half

        // Base radius with directional elongation (comet stretch)
        const dirStretch = 1 + 0.6 * fwdFactor * fwdFactor;

        // Spike amplitude — stronger in forward direction
        const isSpike = i % 2 === 0;
        let spikeAmp = 1.0;
        if (isSpike) {
          const spikeIdx = i / 2;
          const baseSpikeH = 0.15 + 0.1 * Math.sin(t * HEAD_SPIKE_SPEED + spikeIdx * 2.7)
                           + 0.08 * noise(t * 5 + spikeIdx * 17);
          const fwdMult = 1 + 2.0 * fwdFactor;
          spikeAmp = 1 + baseSpikeH * fwdMult;
        }

        const r = headR * dirStretch * spikeAmp;
        const sx = ox + r * Math.cos(a);
        const sy = oy + r * Math.sin(a);
        if (i === 0) gfx.moveTo(sx, sy);
        else gfx.lineTo(sx, sy);
      }
      gfx.closePath();
      gfx.fill({ color: cfg.core, alpha: 1.0 }); // solid, fully opaque
    }

    // Inner bright light — slightly elongated forward
    {
      const innerR = headR * (0.55 + 0.1 * Math.sin(t * 14));
      const innerSegs = 16;
      for (let i = 0; i <= innerSegs; i++) {
        const a = (i / innerSegs) * Math.PI * 2;
        const fwd = Math.max(0, Math.cos(a - beamAngle));
        const r = innerR * (1 + 0.3 * fwd);
        const ix = ox + r * Math.cos(a);
        const iy = oy + r * Math.sin(a);
        if (i === 0) gfx.moveTo(ix, iy);
        else gfx.lineTo(ix, iy);
      }
      gfx.closePath();
      gfx.fill({ color: cfg.bright, alpha: 0.8 });
    }

    // White-hot centre
    const whiteR = headR * (0.25 + 0.06 * Math.sin(t * 18));
    gfx.circle(ox, oy, whiteR);
    gfx.fill({ color: 0xffffff, alpha: 0.7 });
  }

  /* ══════════════════════════════════════════════════
   *  6. IMPACT GLOW  (at the far end / clash point)
   * ══════════════════════════════════════════════════ */
  if (reach > 0.5) {
    const impactAlpha = Math.min(1, (reach - 0.5) * 2) * flicker;
    const impR = halfH * (1.0 + 0.3 * Math.sin(t * 10));
    gfx.circle(endX, endY, impR * 1.3);
    gfx.fill({ color: cfg.aura, alpha: 0.15 * impactAlpha });
    gfx.circle(endX, endY, impR * 0.6);
    gfx.fill({ color: cfg.bright, alpha: 0.25 * impactAlpha });
  }
}
