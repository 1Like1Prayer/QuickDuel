import { useRef } from "react";
import type { Sprite } from "pixi.js";

import {
  ANIM_SPEED,
  COUNTDOWN_FIGHT_MS,
  COUNTDOWN_STEP_MS,
  RING_FADE_IN_DURATION,
  SLOWMO_ANIM_SPEED,
  WIN_TEXT_FADE_DURATION,
} from "../constants";
import { copies } from "../../copies";
import { useGameStore } from "../../state";
import type { Phase, CharAnims } from "../types";
import { getAnimName } from "../utils";
import type { UseDialGameReturn } from "./types/useDialGame.types";

export interface PhaseStateMachineState {
  currentPhase: React.RefObject<Phase>;
  hasAttackIntroCompleted: React.RefObject<boolean>;
  isResultTextVisible: React.RefObject<boolean>;
  resultTextOpacity: React.RefObject<number>;
  resultTextContent: React.RefObject<string>;
  countdownLabel: React.RefObject<string | null>;
  ringContainerOpacity: React.RefObject<number>;
  playerPositionX: React.RefObject<number>;
  opponentPositionX: React.RefObject<number>;
  /** Step sprite animations and phase transitions for the current tick. */
  update: (params: PhaseUpdateParams) => void;
  /** Reset all transient state (called on game restart). */
  resetAll: (dialGame: UseDialGameReturn, ringContainer: { visible: boolean; alpha: number } | null) => void;
}

export interface PhaseUpdateParams {
  dt: number;
  player: Sprite;
  opponent: Sprite;
  playerAnims: CharAnims;
  opponentAnims: CharAnims;
  dialGame: UseDialGameReturn;
  ringContainer: { visible: boolean; alpha: number; x: number; y: number } | null;
}

/** Manages the phase state machine, sprite animations, countdown, and win/lose text fading. */
export function usePhaseStateMachine(
  initialPlayerX: number,
  initialOpponentX: number,
): PhaseStateMachineState {
  const currentPhase = useRef<Phase>("intro");
  const hasAttackIntroCompleted = useRef(false);

  const isResultTextVisible = useRef(false);
  const resultTextOpacity = useRef(0);
  const resultTextContent = useRef(copies.game.result.youWin);
  const countdownLabel = useRef<string | null>(null);
  const ringContainerOpacity = useRef(0);

  const playerPositionX = useRef(initialPlayerX);
  const opponentPositionX = useRef(initialOpponentX);

  const playerAnimFrameIndex = useRef(0);
  const opponentAnimFrameIndex = useRef(0);
  const playerAnimTimer = useRef(0);
  const opponentAnimTimer = useRef(0);
  const isPhaseAnimationComplete = useRef(false);

  const resetAnimCounters = () => {
    playerAnimFrameIndex.current = 0;
    opponentAnimFrameIndex.current = 0;
    playerAnimTimer.current = 0;
    opponentAnimTimer.current = 0;
    isPhaseAnimationComplete.current = false;
  };

  const resetAll = (
    dialGame: UseDialGameReturn,
    ringContainer: { visible: boolean; alpha: number } | null,
  ) => {
    isResultTextVisible.current = false;
    resultTextOpacity.current = 0;
    countdownLabel.current = null;
    ringContainerOpacity.current = 0;
    hasAttackIntroCompleted.current = false;
    dialGame.start();
    dialGame.stop();
    if (ringContainer) {
      ringContainer.visible = false;
      ringContainer.alpha = 0;
    }
    currentPhase.current = "intro";
    resetAnimCounters();
  };

  const update = ({
    dt,
    player,
    opponent,
    playerAnims,
    opponentAnims,
    dialGame,
    ringContainer,
  }: PhaseUpdateParams) => {
    const phase = currentPhase.current;

    // ── Sprite animation stepping ──
    const playerAnimName = getAnimName("player", phase);
    const opponentAnimName = getAnimName("opponent", phase);
    const playerAnimFrames = playerAnims[playerAnimName];
    const opponentAnimFrames = opponentAnims[opponentAnimName];

    if (phase !== "player_win" && phase !== "player_lose" && phase !== "attack_intro") {
      if (hasAttackIntroCompleted.current && playerAnimName === "Idle") {
        const attackFrames = playerAnims["Flame_jet"];
        player.texture = attackFrames[attackFrames.length - 1];
      } else {
        playerAnimTimer.current += dt;
        if (playerAnimTimer.current >= ANIM_SPEED) {
          playerAnimTimer.current = 0;
          playerAnimFrameIndex.current = (playerAnimFrameIndex.current + 1) % playerAnimFrames.length;
          player.texture = playerAnimFrames[playerAnimFrameIndex.current];
        }
      }

      if (hasAttackIntroCompleted.current && opponentAnimName === "Idle") {
        const attackFrames = opponentAnims["Magic_arrow"];
        opponent.texture = attackFrames[attackFrames.length - 1];
      } else {
        opponentAnimTimer.current += dt;
        if (opponentAnimTimer.current >= ANIM_SPEED) {
          opponentAnimTimer.current = 0;
          opponentAnimFrameIndex.current = (opponentAnimFrameIndex.current + 1) % opponentAnimFrames.length;
          opponent.texture = opponentAnimFrames[opponentAnimFrameIndex.current];
        }
      }
    }

    // ── Phase transitions ──
    switch (phase) {
      case "intro": {
        if (useGameStore.getState().phase === "playing") {
          if (ringContainer) {
            ringContainer.visible = true;
            ringContainer.alpha = 0;
          }
          ringContainerOpacity.current = 0;
          currentPhase.current = "countdown";
          countdownLabel.current = copies.game.countdown.three;
          resetAnimCounters();
          const step = COUNTDOWN_STEP_MS;
          setTimeout(() => { countdownLabel.current = copies.game.countdown.two; }, step);
          setTimeout(() => { countdownLabel.current = copies.game.countdown.one; }, step * 2);
          setTimeout(() => { countdownLabel.current = copies.game.countdown.fight; }, step * 3);
          setTimeout(() => {
            countdownLabel.current = null;
            currentPhase.current = "attack_intro";
            resetAnimCounters();
            dialGame.start();
          }, step * 3 + COUNTDOWN_FIGHT_MS);
        }
        break;
      }

      case "countdown": {
        if (ringContainerOpacity.current < 1) {
          ringContainerOpacity.current = Math.min(1, ringContainerOpacity.current + dt / RING_FADE_IN_DURATION);
          if (ringContainer) ringContainer.alpha = ringContainerOpacity.current;
        }
        break;
      }

      case "attack_intro": {
        const pFrames = playerAnims["Flame_jet"];
        const oFrames = opponentAnims["Magic_arrow"];
        player.texture = pFrames[playerAnimFrameIndex.current];
        opponent.texture = oFrames[opponentAnimFrameIndex.current];

        playerAnimTimer.current += dt;
        if (playerAnimTimer.current >= ANIM_SPEED) {
          playerAnimTimer.current = 0;
          if (playerAnimFrameIndex.current < pFrames.length - 1) playerAnimFrameIndex.current++;
        }
        opponentAnimTimer.current += dt;
        if (opponentAnimTimer.current >= ANIM_SPEED) {
          opponentAnimTimer.current = 0;
          if (opponentAnimFrameIndex.current < oFrames.length - 1) opponentAnimFrameIndex.current++;
        }

        if (
          playerAnimFrameIndex.current >= pFrames.length - 1 &&
          opponentAnimFrameIndex.current >= oFrames.length - 1 &&
          !isPhaseAnimationComplete.current
        ) {
          isPhaseAnimationComplete.current = true;
          hasAttackIntroCompleted.current = true;
          currentPhase.current = "idle";
          resetAnimCounters();
        }
        break;
      }

      case "fight_text":
      case "idle":
        break;

      case "player_win": {
        if (useGameStore.getState().phase !== "ended") {
          // Game was restarted — reset
          break;
        }

        if (ringContainerOpacity.current > 0) {
          ringContainerOpacity.current = Math.max(0, ringContainerOpacity.current - dt / RING_FADE_IN_DURATION);
          if (ringContainer) {
            ringContainer.alpha = ringContainerOpacity.current;
            if (ringContainerOpacity.current <= 0) ringContainer.visible = false;
          }
        }

        opponentAnimTimer.current += dt;
        if (opponentAnimTimer.current >= SLOWMO_ANIM_SPEED) {
          opponentAnimTimer.current = 0;
          if (opponentAnimFrameIndex.current < opponentAnimFrames.length - 1) {
            opponentAnimFrameIndex.current++;
            opponent.texture = opponentAnimFrames[opponentAnimFrameIndex.current];
          } else if (!isPhaseAnimationComplete.current) {
            isPhaseAnimationComplete.current = true;
            isResultTextVisible.current = true;
          }
        }

        {
          const idleFrames = playerAnims["Idle"];
          playerAnimTimer.current += dt;
          if (playerAnimTimer.current >= ANIM_SPEED) {
            playerAnimTimer.current = 0;
            playerAnimFrameIndex.current = (playerAnimFrameIndex.current + 1) % idleFrames.length;
            player.texture = idleFrames[playerAnimFrameIndex.current];
          }
        }

        if (isResultTextVisible.current && resultTextOpacity.current < 1) {
          resultTextOpacity.current = Math.min(1, resultTextOpacity.current + dt / WIN_TEXT_FADE_DURATION);
        }
        break;
      }

      case "player_lose": {
        if (useGameStore.getState().phase !== "ended") {
          break;
        }

        if (ringContainerOpacity.current > 0) {
          ringContainerOpacity.current = Math.max(0, ringContainerOpacity.current - dt / RING_FADE_IN_DURATION);
          if (ringContainer) {
            ringContainer.alpha = ringContainerOpacity.current;
            if (ringContainerOpacity.current <= 0) ringContainer.visible = false;
          }
        }

        playerAnimTimer.current += dt;
        if (playerAnimTimer.current >= SLOWMO_ANIM_SPEED) {
          playerAnimTimer.current = 0;
          if (playerAnimFrameIndex.current < playerAnimFrames.length - 1) {
            playerAnimFrameIndex.current++;
            player.texture = playerAnimFrames[playerAnimFrameIndex.current];
          } else if (!isPhaseAnimationComplete.current) {
            isPhaseAnimationComplete.current = true;
            isResultTextVisible.current = true;
          }
        }

        {
          const idleFrames = opponentAnims["Idle"];
          opponentAnimTimer.current += dt;
          if (opponentAnimTimer.current >= ANIM_SPEED) {
            opponentAnimTimer.current = 0;
            opponentAnimFrameIndex.current = (opponentAnimFrameIndex.current + 1) % idleFrames.length;
            opponent.texture = idleFrames[opponentAnimFrameIndex.current];
          }
        }

        if (isResultTextVisible.current && resultTextOpacity.current < 1) {
          resultTextOpacity.current = Math.min(1, resultTextOpacity.current + dt / WIN_TEXT_FADE_DURATION);
        }
        break;
      }
    }
  };

  return {
    currentPhase,
    hasAttackIntroCompleted,
    isResultTextVisible,
    resultTextOpacity,
    resultTextContent,
    countdownLabel,
    ringContainerOpacity,
    playerPositionX,
    opponentPositionX,
    update,
    resetAll,
  };
}
