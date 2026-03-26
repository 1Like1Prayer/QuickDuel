import { useRef } from "react";

import { useGameStore } from "../../state";

export interface AudioManager {
  /** Fire wizard hit impact SFX. */
  fireImpact: React.RefObject<HTMLAudioElement | null>;
  /** Light wizard hit impact SFX. */
  lightImpact: React.RefObject<HTMLAudioElement | null>;
  /** Fire wizard finishing-blow launch SFX. */
  fireLaunch: React.RefObject<HTMLAudioElement | null>;
  /** Light wizard finishing-blow launch SFX. */
  lightLaunch: React.RefObject<HTMLAudioElement | null>;
  /** Beam-vs-beam clash SFX (tied rounds). */
  beamClash: React.RefObject<HTMLAudioElement | null>;
  /** Whether the continuous beam loop audio is currently playing. */
  isBeamPlaying: React.RefObject<boolean>;
  /** Play a one-shot SFX from start (respects mute/sfx settings). */
  playOneShot: (ref: React.RefObject<HTMLAudioElement | null>) => void;
  /** Start all beam-related audio loops (fire hold, light hold, cast one-shots). */
  startBeamLoops: () => void;
  /** Pause all beam loop audio. */
  stopBeamLoops: () => void;
  /** Sync beam loop play/pause state with the current mute/sfx settings. */
  syncBeamLoopMute: () => void;
}

/** Create a pre-configured HTMLAudioElement. */
function makeAudio(src: string, loop: boolean, volume: number): HTMLAudioElement {
  const audioElement = new Audio(src);
  audioElement.loop = loop;
  audioElement.volume = volume;
  return audioElement;
}

/** Manages all game sound effects via refs. No React state — pure imperative audio. */
export function useAudioManager(): AudioManager {
  const fireBeamLoop = useRef<HTMLAudioElement | null>(null);
  if (fireBeamLoop.current == null) {
    fireBeamLoop.current = makeAudio("/sounds/EM_FIRE_HOLD_4s.ogg", true, 0.8);
  }

  const lightBeamLoop = useRef<HTMLAudioElement | null>(null);
  if (lightBeamLoop.current == null) {
    lightBeamLoop.current = makeAudio("/sounds/EM_LIGHT_HOLD_5s.ogg", true, 0.8);
  }

  const lightCastOneShot = useRef<HTMLAudioElement | null>(null);
  if (lightCastOneShot.current == null) {
    lightCastOneShot.current = makeAudio("/sounds/EM_LIGHT_CAST_02_S.ogg", false, 0.8);
  }

  const fireCastOneShot = useRef<HTMLAudioElement | null>(null);
  if (fireCastOneShot.current == null) {
    fireCastOneShot.current = makeAudio("/sounds/EM_FIRE_CAST_02.ogg", false, 0.8);
  }

  const isBeamPlaying = useRef(false);

  const fireImpact = useRef<HTMLAudioElement | null>(null);
  if (fireImpact.current == null) {
    fireImpact.current = makeAudio("/sounds/EM_FIRE_IMPACT_01.ogg", false, 1.0);
  }

  const lightImpact = useRef<HTMLAudioElement | null>(null);
  if (lightImpact.current == null) {
    lightImpact.current = makeAudio("/sounds/EM_LIGHT_IMPACT_01.ogg", false, 1.0);
  }

  const fireLaunch = useRef<HTMLAudioElement | null>(null);
  if (fireLaunch.current == null) {
    fireLaunch.current = makeAudio("/sounds/EM_FIRE_LAUNCH_01.ogg", false, 1.0);
  }

  const lightLaunch = useRef<HTMLAudioElement | null>(null);
  if (lightLaunch.current == null) {
    lightLaunch.current = makeAudio("/sounds/EM_LIGHT_LAUNCH_01.ogg", false, 1.0);
  }

  const beamClash = useRef<HTMLAudioElement | null>(null);
  if (beamClash.current == null) {
    beamClash.current = makeAudio("/sounds/dragon-studio-epic-spell-impact-478364.mp3", false, 1.0);
  }

  /** Check whether SFX playback is currently allowed (not muted, sfx enabled). */
  const canPlay = (): boolean => {
    const { sfxEnabled, muted } = useGameStore.getState();
    return sfxEnabled && !muted;
  };

  const playOneShot = (ref: React.RefObject<HTMLAudioElement | null>) => {
    if (canPlay() && ref.current) {
      ref.current.currentTime = 0;
      ref.current.play().catch(() => {});
    }
  };

  const startBeamLoops = () => {
    if (isBeamPlaying.current) return;
    isBeamPlaying.current = true;
    if (!canPlay()) return;
    for (const ref of [fireBeamLoop, lightBeamLoop, lightCastOneShot, fireCastOneShot]) {
      if (ref.current) {
        ref.current.currentTime = 0;
        ref.current.play().catch(() => {});
      }
    }
  };

  const stopBeamLoops = () => {
    if (!isBeamPlaying.current) return;
    if (fireBeamLoop.current) fireBeamLoop.current.pause();
    if (lightBeamLoop.current) lightBeamLoop.current.pause();
    isBeamPlaying.current = false;
  };

  const syncBeamLoopMute = () => {
    if (!isBeamPlaying.current) return;
    const shouldPlay = canPlay();
    for (const ref of [fireBeamLoop, lightBeamLoop]) {
      if (!ref.current) continue;
      if (!shouldPlay && !ref.current.paused) ref.current.pause();
      else if (shouldPlay && ref.current.paused) ref.current.play().catch(() => {});
    }
  };

  return {
    fireImpact,
    lightImpact,
    fireLaunch,
    lightLaunch,
    beamClash,
    isBeamPlaying,
    playOneShot,
    startBeamLoops,
    stopBeamLoops,
    syncBeamLoopMute,
  };
}
