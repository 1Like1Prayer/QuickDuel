import { useTick } from "@pixi/react";
import { Graphics, Sprite, Texture } from "pixi.js";
import { useEffect, useRef } from "react";

import {
  ANIM_SPEED,
  COUNTDOWN_FIGHT_MS,
  COUNTDOWN_STEP_MS,
  LASER_ANIM_SPEED,
  RING_FADE_IN_DURATION,
  SHAKE_DURATION,
  SLOWMO_ANIM_SPEED,
  WIN_TEXT_FADE_DURATION,
} from "../constants";
import { useGameStore } from "../../state";
import type { BloodParticle, Phase } from "../types";
import type { SparkParticle } from "../utils/particles";
import {
  spawnBlood,
  spawnSparks,
  updateBloodParticles,
  updateSparkParticles,
} from "../utils/particles";
import { getAnimName } from "../utils/phases";
import { cpuTakeTurn, createCpuState } from "../services/cpuService";
import type { GameLoopParams } from "./types/useGameLoop.types";

export function useGameLoop({
  app,
  refs,
  bgTexture,
  laserFrames,
  blueLaserFrames,
  playerAnims,
  opponentAnims,
  dialGame,
  layout,
}: GameLoopParams) {
  const bloodGfx = useRef<Graphics | null>(null);
  const sparkGfx = useRef<Graphics | null>(null);
  const laserDebugGfx = useRef<Graphics | null>(null);

  // Win/Lose text state (read by Scene for rendering)
  const showWinText = useRef(false);
  const winTextAlpha = useRef(0);
  const winnerText = useRef("You Win");

  // Countdown state (read by Scene for rendering)
  const countdownText = useRef<string | null>(null);  // "3", "2", "1", "FIGHT!" or null
  const ringAlpha = useRef(0);                        // fade-in alpha for the ring container

  // Phase state machine
  const phase = useRef<Phase>("intro");

  // Place characters at the screen edges
  const playerFightX = layout.positions.charStartX;
  const opponentFightX = layout.positions.charEndX;

  const playerX = useRef(playerFightX);
  const opponentX = useRef(opponentFightX);

  const playerFrame = useRef(0);
  const opponentFrame = useRef(0);
  const playerElapsed = useRef(0);
  const opponentElapsed = useRef(0);
  const phaseAnimDone = useRef(false);

  // Whether the initial attack-intro animation has played (after which we loop last 2 frames)
  const attackIntroPlayed = useRef(false);

  const shakeTimer = useRef(0);
  const isShaking = useRef(false);

  const bloodParticles = useRef<BloodParticle[]>([]);
  const sparkParticles = useRef<SparkParticle[]>([]);

  // Laser animation state
  const laserFrame = useRef(0);     // 0 = start frame, 1 = loop frame
  const laserElapsed = useRef(0);
  const laserStarted = useRef(false);

  // Blue laser animation state (opponent)
  const blueLaserFrame = useRef(0);
  const blueLaserElapsed = useRef(0);
  const blueLaserStarted = useRef(false);

  // Track last consumed dial hit result to avoid re-processing
  const lastDialResult = useRef<boolean | null>(null);

  // CPU state â€” independent block count & katana streak
  const cpuState = useRef(createCpuState());
  const cpuHitColors = useRef<number[]>([]);
  const lastRegenCount = useRef(0);
  const cpuTurnTakenThisLap = useRef(false);

  /** Run the CPU's virtual turn and return the points scored (0 if miss). */
  const doCpuTurn = (): number => {
    if (useGameStore.getState().phase === "ended") return 0;
    cpuTurnTakenThisLap.current = true;
    const difficulty = useGameStore.getState().difficulty;
    const { result, next } = cpuTakeTurn(cpuState.current, difficulty);
    cpuState.current = next;
    cpuHitColors.current = next.hitColors;
    return result.hit ? result.points : 0;
  };

  /** Resolve a round and trigger the appropriate attack/clash animation based on delta. */
  const doResolveRound = (playerHit: number, cpuHit: number) => {
    const delta = playerHit - cpuHit;
    useGameStore.getState().resolveRound(playerHit, cpuHit);

    // Check if round resolution triggered game-over
    const storePhase = useGameStore.getState().phase;
    if (storePhase === "ended" && phase.current !== "player_lose" && phase.current !== "player_win") {
      const playerWon = useGameStore.getState().playerPoints > useGameStore.getState().opponentPoints;
      if (playerWon) {
        winnerText.current = "You Win";
        phase.current = "player_win";
        resetPhaseFrames();
        dialGame.stop();
        if (refs.ringContainer.current) refs.ringContainer.current.visible = false;
        if (refs.katanaContainer.current) refs.katanaContainer.current.visible = false;
        if (refs.cpuKatanaContainer.current) refs.cpuKatanaContainer.current.visible = false;
        startShake();
        spawnBlood(
          bloodParticles.current,
          opponentX.current + layout.characters.charSize * 0.4,
          layout.positions.groundY + layout.characters.charSize * 0.4,
          1,
        );
      } else {
        winnerText.current = "You Lose";
        phase.current = "player_lose";
        resetPhaseFrames();
        dialGame.stop();
        if (refs.ringContainer.current) refs.ringContainer.current.visible = false;
        if (refs.katanaContainer.current) refs.katanaContainer.current.visible = false;
        if (refs.cpuKatanaContainer.current) refs.cpuKatanaContainer.current.visible = false;
        startShake();
        spawnBlood(
          bloodParticles.current,
          playerX.current + layout.characters.charSize * 0.4,
          layout.positions.groundY + layout.characters.charSize * 0.4,
          -1,
        );
      }
      return;
    }

    // Choose animation based on delta
    if (delta > 0) {
      // Player hit — shake + blood on opponent, stay in idle
      startShake();
      spawnBlood(
        bloodParticles.current,
        opponentX.current + layout.characters.charSize * 0.4,
        layout.positions.groundY + layout.characters.charSize * 0.4,
        1,
      );
    } else if (delta < 0) {
      // Opponent hit — shake + blood on player, stay in idle
      startShake();
      spawnBlood(
        bloodParticles.current,
        playerX.current + layout.characters.charSize * 0.4,
        layout.positions.groundY + layout.characters.charSize * 0.4,
        -1,
      );
    } else {
      // delta === 0: clash — shake + sparks
      startShake();
      const clashX =
        (playerX.current + layout.characters.charSize + opponentX.current) / 2;
      const clashY =
        layout.positions.groundY + layout.characters.charSize * 0.35;
      spawnSparks(sparkParticles.current, clashX, clashY);
    }
  };

  // â”€â”€ Attach Graphics layers to the container â”€â”€

  useEffect(() => {
    const container = refs.container.current;
    if (!container) return;

    const bGfx = new Graphics();
    const sGfx = new Graphics();
    const lDbg = new Graphics();
    bloodGfx.current = bGfx;
    sparkGfx.current = sGfx;
    laserDebugGfx.current = lDbg;
    container.addChild(bGfx);
    container.addChild(sGfx);
    container.addChild(lDbg);

    return () => {
      container.removeChild(bGfx);
      container.removeChild(sGfx);
      container.removeChild(lDbg);
      bGfx.destroy();
      sGfx.destroy();
      lDbg.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // â”€â”€ Input listener for dial game (Space / click / tap) â”€â”€

  useEffect(() => {
    const combatPhases: Phase[] = [
      "idle",
    ];

    const handleInput = (e?: KeyboardEvent) => {
      if (e && e.key !== " ") return;
      if (e) e.preventDefault();

      // Allow input during any combat phase (not fight_text / clash)
      if (!combatPhases.includes(phase.current)) return;
      if (!dialGame.active.current) return;

      const hit = dialGame.attempt();
      if (hit === null) return; // already attempted this lap â€” ignore

      // CPU also takes its turn
      const cpuHit = doCpuTurn();
      const playerHit = hit ? dialGame.lastHitPoints.current : 0;
      doResolveRound(playerHit, cpuHit);
    };

    const onKeyDown = (e: KeyboardEvent) => handleInput(e);
    const onPointerDown = () => handleInput();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialGame]);

  const resetPhaseFrames = () => {
    playerFrame.current = 0;
    opponentFrame.current = 0;
    playerElapsed.current = 0;
    opponentElapsed.current = 0;
    phaseAnimDone.current = false;
  };

  const startShake = () => {
    shakeTimer.current = SHAKE_DURATION;
    isShaking.current = true;
  };


  // â”€â”€ Main tick â”€â”€

  useTick((ticker) => {
    const { container, bg, player, opponent } = refs;
    if (
      !player.current ||
      !opponent.current ||
      !container.current ||
      !bg.current
    )
      return;
    if (!playerAnims || !opponentAnims) return;

    // Scale background to cover the viewport
    if (bgTexture !== Texture.EMPTY) {
      const s = Math.max(
        app.screen.width / bgTexture.width,
        app.screen.height / bgTexture.height,
      );
      bg.current.scale.set(s);
      bg.current.x = (app.screen.width - bgTexture.width * s) / 2;
      bg.current.y = (app.screen.height - bgTexture.height * s) / 2;
    }

    const dt = ticker.deltaTime / 60;
    const curPhase = phase.current;

    // — Sprite animation stepping —

    const playerAnimName = getAnimName("player", curPhase);
    const opponentAnimName = getAnimName("opponent", curPhase);
    const playerAnim = playerAnims[playerAnimName];
    const opponentAnim = opponentAnims[opponentAnimName];

    if (curPhase !== "player_win" && curPhase !== "player_lose" && curPhase !== "attack_intro") {
      if (attackIntroPlayed.current && playerAnimName === "Idle") {
        // Hold last frame of attack animation instead of Idle
        const atkAnim = playerAnims["Flame_jet"];
        player.current.texture = atkAnim[atkAnim.length - 1];
      } else {
        playerElapsed.current += dt;
        if (playerElapsed.current >= ANIM_SPEED) {
          playerElapsed.current = 0;
          playerFrame.current = (playerFrame.current + 1) % playerAnim.length;
          player.current.texture = playerAnim[playerFrame.current];
        }
      }

      if (attackIntroPlayed.current && opponentAnimName === "Idle") {
        // Hold last frame of attack animation instead of Idle
        const atkAnim = opponentAnims["Magic_arrow"];
        opponent.current.texture = atkAnim[atkAnim.length - 1];
      } else {
        opponentElapsed.current += dt;
        if (opponentElapsed.current >= ANIM_SPEED) {
          opponentElapsed.current = 0;
          opponentFrame.current = (opponentFrame.current + 1) % opponentAnim.length;
          opponent.current.texture = opponentAnim[opponentFrame.current];
        }
      }
    }
    switch (curPhase) {
      case "intro": {
        // Characters visible and idle; waiting for store phase change
        if (useGameStore.getState().phase === "playing") {
          // Make ring & katana containers visible but fully transparent
          if (refs.ringContainer.current) {
            refs.ringContainer.current.visible = true;
            refs.ringContainer.current.alpha = 0;
          }
          if (refs.katanaContainer.current) {
            refs.katanaContainer.current.visible = true;
          }
          if (refs.cpuKatanaContainer.current) {
            refs.cpuKatanaContainer.current.visible = true;
          }
          ringAlpha.current = 0;
          phase.current = "countdown";
          countdownText.current = "3";
          resetPhaseFrames();
          const step = COUNTDOWN_STEP_MS;
          setTimeout(() => { countdownText.current = "2"; }, step);
          setTimeout(() => { countdownText.current = "1"; }, step * 2);
          setTimeout(() => {
            countdownText.current = "FIGHT!";
          }, step * 3);
          setTimeout(() => {
            countdownText.current = null;
            phase.current = "attack_intro";
            resetPhaseFrames();
            dialGame.start();
          }, step * 3 + COUNTDOWN_FIGHT_MS);
        }
        break;
      }


      case "countdown": {
        // Fade in ring/dial during countdown
        if (ringAlpha.current < 1) {
          ringAlpha.current = Math.min(1, ringAlpha.current + dt / RING_FADE_IN_DURATION);
          if (refs.ringContainer.current) {
            refs.ringContainer.current.alpha = ringAlpha.current;
          }
        }
        break;
      }

      case "attack_intro": {
        // Play each character's attack animation once (no wrapping)
        const pAtk = playerAnims["Flame_jet"];
        const oAtk = opponentAnims["Magic_arrow"];

        // Show current frame texture
        player.current.texture = pAtk[playerFrame.current];
        opponent.current.texture = oAtk[opponentFrame.current];

        // Advance player
        playerElapsed.current += dt;
        if (playerElapsed.current >= ANIM_SPEED) {
          playerElapsed.current = 0;
          if (playerFrame.current < pAtk.length - 1) playerFrame.current++;
        }

        // Advance opponent
        opponentElapsed.current += dt;
        if (opponentElapsed.current >= ANIM_SPEED) {
          opponentElapsed.current = 0;
          if (opponentFrame.current < oAtk.length - 1) opponentFrame.current++;
        }

        // Transition to idle once both animations have completed
        if (
          playerFrame.current >= pAtk.length - 1 &&
          opponentFrame.current >= oAtk.length - 1 &&
          !phaseAnimDone.current
        ) {
          phaseAnimDone.current = true;
          attackIntroPlayed.current = true;
          phase.current = "idle";
          resetPhaseFrames();
        }
        break;
      }

      case "fight_text":
      case "idle": {
        break;
      }

      case "player_win": {
        const storePhase = useGameStore.getState().phase;
        if (storePhase !== "ended") {
          showWinText.current = false;
          winTextAlpha.current = 0;
          countdownText.current = null;
          ringAlpha.current = 0;
          bloodParticles.current = [];
          sparkParticles.current = [];
          lastDialResult.current = null;
          cpuState.current = createCpuState();
          cpuHitColors.current = [];
          lastRegenCount.current = 0;
          cpuTurnTakenThisLap.current = false;
          attackIntroPlayed.current = false;
          // Fully reset dial game state (blocks, speed, colors, katanas)
          dialGame.start();
          dialGame.stop();
          // Hide ring & katana containers on full reset
          if (refs.ringContainer.current) {
            refs.ringContainer.current.visible = false;
            refs.ringContainer.current.alpha = 0;
          }
          if (refs.katanaContainer.current) refs.katanaContainer.current.visible = false;
          if (refs.cpuKatanaContainer.current) refs.cpuKatanaContainer.current.visible = false;

          if (storePhase === "playing") {
            phase.current = "intro";
            resetPhaseFrames();
          } else {
            phase.current = "intro";
            resetPhaseFrames();
          }
          break;
        }

        opponentElapsed.current += dt;
        if (opponentElapsed.current >= SLOWMO_ANIM_SPEED) {
          opponentElapsed.current = 0;
          if (opponentFrame.current < opponentAnim.length - 1) {
            opponentFrame.current++;
            opponent.current.texture = opponentAnim[opponentFrame.current];
          } else if (!phaseAnimDone.current) {
            phaseAnimDone.current = true;
            showWinText.current = true;
          }
        }

        if (showWinText.current && winTextAlpha.current < 1) {
          winTextAlpha.current = Math.min(1, winTextAlpha.current + dt / WIN_TEXT_FADE_DURATION);
        }
        break;
        }
  
        case "player_lose": {
          const storePhase = useGameStore.getState().phase;
          if (storePhase !== "ended") {
            showWinText.current = false;
            winTextAlpha.current = 0;
            countdownText.current = null;
            ringAlpha.current = 0;
                    bloodParticles.current = [];
            sparkParticles.current = [];
            lastDialResult.current = null;
            cpuState.current = createCpuState();
            cpuHitColors.current = [];
            lastRegenCount.current = 0;
            cpuTurnTakenThisLap.current = false;
            attackIntroPlayed.current = false;
            // Fully reset dial game state (blocks, speed, colors, katanas)
            dialGame.start();
            dialGame.stop();
            // Hide ring & katana containers on full reset
            if (refs.ringContainer.current) {
              refs.ringContainer.current.visible = false;
              refs.ringContainer.current.alpha = 0;
            }
            if (refs.katanaContainer.current) refs.katanaContainer.current.visible = false;
            if (refs.cpuKatanaContainer.current) refs.cpuKatanaContainer.current.visible = false;
  
            if (storePhase === "playing") {
              phase.current = "intro";
              resetPhaseFrames();
            } else {
              phase.current = "intro";
              resetPhaseFrames();
            }
            break;
          }
  
          // Slow-motion player death animation
          playerElapsed.current += dt;
          if (playerElapsed.current >= SLOWMO_ANIM_SPEED) {
            playerElapsed.current = 0;
            if (playerFrame.current < playerAnim.length - 1) {
              playerFrame.current++;
              player.current.texture = playerAnim[playerFrame.current];
            } else if (!phaseAnimDone.current) {
              phaseAnimDone.current = true;
              showWinText.current = true;
            }
          }
  
          if (showWinText.current && winTextAlpha.current < 1) {
            winTextAlpha.current = Math.min(1, winTextAlpha.current + dt / WIN_TEXT_FADE_DURATION);
          }
          break;
        }
    }

    // â”€â”€ CPU turn on block regeneration (only if no player hit triggered it already) â”€â”€
    const currentRegen = dialGame.regenCount.current;
    if (currentRegen > lastRegenCount.current) {
      const isFirstGate = lastRegenCount.current === 0;
      lastRegenCount.current = currentRegen;
      // Skip the very first gate â€” blocks are just being generated, the player
      // hasn't had a chance to act yet. Only resolve on subsequent gates.
      if (!isFirstGate && !cpuTurnTakenThisLap.current && phase.current !== "attack_intro") {
        // Player missed or skipped — player hit = 0, CPU takes a turn
        const cpuHit = doCpuTurn();
        doResolveRound(0, cpuHit);
      }
      cpuTurnTakenThisLap.current = false;
    }

    // ── Apply positions & orientation ──

    player.current.x = playerX.current;
    opponent.current.x = opponentX.current;

    player.current.scale.x = layout.characters.charScale;
    player.current.anchor.x = 0;

    opponent.current.scale.x = -layout.characters.charScale;
    opponent.current.anchor.x = 1;

    // ── Laser beam (visible only during attack-loop after intro) ──

    const laserSrc = refs.laserSource.current;
    const laserMid = refs.laserMiddle.current;
    const laserImp = refs.laserImpact.current;

    if (laserSrc && laserMid && laserImp && laserFrames) {
      // Show laser only while looping the last 2 attack frames (after attack_intro)
      const showLaser =
        attackIntroPlayed.current &&
        curPhase !== "intro" &&
        curPhase !== "attack_intro" &&
        curPhase !== "player_win" &&
        curPhase !== "player_lose";

      if (showLaser) {
        laserSrc.visible = true;
        laserMid.visible = true;
        laserImp.visible = true;

        // Advance laser animation at 24 fps
        laserElapsed.current += dt;
        if (laserElapsed.current >= LASER_ANIM_SPEED) {
          laserElapsed.current = 0;
          if (!laserStarted.current) {
            // Playing start frames (0-3), then switch to loop
            laserFrame.current++;
            if (laserFrame.current >= 4) {
              laserStarted.current = true;
              laserFrame.current = 0; // begin loop frames
            }
          } else {
            // Cycle through loop frames (0-3)
            laserFrame.current = (laserFrame.current + 1) % 4;
          }
        }

        const fi = laserFrame.current;
        const midTex = !laserStarted.current
          ? laserFrames.middleStart[fi]
          : laserFrames.middleLoop[fi];

        if (!laserStarted.current) {
          laserSrc.texture = laserFrames.sourceStart[fi];
          laserImp.texture = laserFrames.impactStart[fi];
        } else {
          laserSrc.texture = laserFrames.sourceLoop[fi];
          laserImp.texture = laserFrames.impactLoop[fi];
        }

        const charSize = layout.characters.charSize;
        const frameW = laserFrames.sourceStart[0].width;  // 48
        const frameH = laserFrames.sourceStart[0].height;  // 48
        const beamHeight = charSize * 0.75;
        const scaleY = beamHeight / frameH;
        const scaledW = frameW * scaleY;
        const beamY = layout.positions.groundY + charSize * 0.66;

        // Source: at the fire mage's hands
        const originX = playerX.current + charSize * 0.15;
        laserSrc.x = originX;
        laserSrc.y = beamY;
        laserSrc.anchor.set(0, 0.5);
        laserSrc.scale.set(scaleY, scaleY);

        // Impact: a bit past the middle of the screen (shifted left on phones)
        const smallScreen = layout.base.unit < 500;
        const impactX = layout.positions.meetX + charSize * (smallScreen ? 0.2 : 0.3);
        laserImp.x = impactX;
        laserImp.y = beamY;
        laserImp.anchor.set(1, 0.5);
        laserImp.scale.set(scaleY, scaleY);

        // Tiled middle: start overlapping the source section
        const midStartX = originX + scaledW * 0.30;
        const midEndX = impactX - scaledW;
        const midSpan = midEndX - midStartX;
        const tileStep = scaledW * 0.3; // overlap each tile by 30%
        const tileCount = Math.max(1, Math.ceil(midSpan / tileStep));

        // Add/remove sprites to match tile count
        while (laserMid.children.length < tileCount) {
          const s = new Sprite();
          s.anchor.set(0, 0.5);
          laserMid.addChild(s);
        }
        while (laserMid.children.length > tileCount) {
          const removed = laserMid.removeChildAt(laserMid.children.length - 1);
          removed.destroy();
        }

        // Position and texture each tile
        for (let i = 0; i < tileCount; i++) {
          const tile = laserMid.children[i] as Sprite;
          tile.texture = midTex;
          tile.x = midStartX + i * tileStep;
          tile.y = beamY;
          tile.scale.set(scaleY, scaleY);
        }

        // Ensure source and impact render on top of middle tiles
        laserMid.zIndex = 0;
        laserSrc.zIndex = 1;
        laserImp.zIndex = 1;

        // DEBUG: Draw borders around each laser section
        const dbg = laserDebugGfx.current;
        if (dbg) {
          dbg.clear();
          const halfH = beamHeight / 2;
          // Source section border (green)
          dbg.rect(originX, beamY - halfH, scaledW, beamHeight);
          dbg.stroke({ color: 0x00ff00, width: 2, alpha: 1 });
          // Each middle tile border (red)
          for (let i = 0; i < tileCount; i++) {
            dbg.rect(midStartX + i * tileStep, beamY - halfH, scaledW, beamHeight);
            dbg.stroke({ color: 0xff0000, width: 2, alpha: 1 });
          }
          // Impact section border (blue)
          dbg.rect(impactX - scaledW, beamY - halfH, scaledW, beamHeight);
          dbg.stroke({ color: 0x0000ff, width: 2, alpha: 1 });
        }
      } else {
        laserSrc.visible = false;
        laserMid.visible = false;
        laserImp.visible = false;
        laserFrame.current = 0;
        laserElapsed.current = 0;
        laserStarted.current = false;
        if (laserDebugGfx.current) laserDebugGfx.current.clear();
      }
    }
    // â"€â"€ Blue laser (opponent â†' left) â"€â"€

    const blueSrc = refs.blueLaserSource.current;
    const blueMid = refs.blueLaserMiddle.current;
    const blueImp = refs.blueLaserImpact.current;

    if (blueSrc && blueMid && blueImp && blueLaserFrames) {
      const showBlueLaser =
        attackIntroPlayed.current &&
        curPhase !== "intro" &&
        curPhase !== "attack_intro" &&
        curPhase !== "player_win" &&
        curPhase !== "player_lose";

      if (showBlueLaser) {
        blueSrc.visible = true;
        blueMid.visible = true;
        blueImp.visible = true;

        // Advance blue laser animation at 24 fps
        blueLaserElapsed.current += dt;
        if (blueLaserElapsed.current >= LASER_ANIM_SPEED) {
          blueLaserElapsed.current = 0;
          if (!blueLaserStarted.current) {
            blueLaserFrame.current++;
            if (blueLaserFrame.current >= 4) {
              blueLaserStarted.current = true;
              blueLaserFrame.current = 0;
            }
          } else {
            blueLaserFrame.current = (blueLaserFrame.current + 1) % 4;
          }
        }

        const bfi = blueLaserFrame.current;
        const blueMidTex = !blueLaserStarted.current
          ? blueLaserFrames.middleStart[bfi]
          : blueLaserFrames.middleLoop[bfi];

        if (!blueLaserStarted.current) {
          blueSrc.texture = blueLaserFrames.sourceStart[bfi];
          blueImp.texture = blueLaserFrames.impactStart[bfi];
        } else {
          blueSrc.texture = blueLaserFrames.sourceLoop[bfi];
          blueImp.texture = blueLaserFrames.impactLoop[bfi];
        }

        const charSize = layout.characters.charSize;
        const frameW = blueLaserFrames.sourceStart[0].width;
        const frameH = blueLaserFrames.sourceStart[0].height;
        const beamHeight = charSize * 0.75;
        const scaleY = beamHeight / frameH;
        const scaledW = frameW * scaleY;
        const beamY = layout.positions.groundY + charSize * 0.66;

        // Source: at the wanderer mage's hands (mirrored — facing left)
        const blueOriginX = opponentX.current + charSize * 0.65;
        blueSrc.x = blueOriginX;
        blueSrc.y = beamY;
        blueSrc.anchor.set(0, 0.5);
        blueSrc.scale.set(-scaleY, scaleY); // flip horizontally

        // Impact: a little before the middle of the screen (going left, shifted left on phones)
        const blueSmallScreen = layout.base.unit < 500;
        const blueImpactX = layout.positions.meetX - charSize * (blueSmallScreen ? 0.30 : 0.2);
        blueImp.x = blueImpactX;
        blueImp.y = beamY;
        blueImp.anchor.set(1, 0.5);
        blueImp.scale.set(-scaleY, scaleY); // flip horizontally

        // Tiled middle: fill gap going right-to-left (mirrored)
        const blueMidStartX = blueOriginX - scaledW * 0.30;
        const blueMidEndX = blueImpactX + scaledW;
        const blueMidSpan = blueMidStartX - blueMidEndX;
        const blueTileStep = scaledW * 0.3;
        const blueTileCount = Math.max(1, Math.ceil(blueMidSpan / blueTileStep));

        while (blueMid.children.length < blueTileCount) {
          const s = new Sprite();
          s.anchor.set(0, 0.5);
          blueMid.addChild(s);
        }
        while (blueMid.children.length > blueTileCount) {
          const removed = blueMid.removeChildAt(blueMid.children.length - 1);
          removed.destroy();
        }

        for (let i = 0; i < blueTileCount; i++) {
          const tile = blueMid.children[i] as Sprite;
          tile.texture = blueMidTex;
          tile.x = blueMidStartX - i * blueTileStep;
          tile.y = beamY;
          tile.scale.set(-scaleY, scaleY); // flip horizontally
        }

        blueMid.zIndex = 0;
        blueSrc.zIndex = 1;
        blueImp.zIndex = 1;
      } else {
        blueSrc.visible = false;
        blueMid.visible = false;
        blueImp.visible = false;
        blueLaserFrame.current = 0;
        blueLaserElapsed.current = 0;
        blueLaserStarted.current = false;
      }
    }
    // â”€â”€ Screen shake â”€â”€

    if (isShaking.current) {
      shakeTimer.current -= dt;
      if (shakeTimer.current <= 0) {
        isShaking.current = false;
        container.current.x = 0;
        container.current.y = 0;
      } else {
        const progress = shakeTimer.current / SHAKE_DURATION;
        const intensity = layout.movement.shakeIntensity * progress;
        container.current.x = (Math.random() - 0.5) * 2 * intensity;
        container.current.y = (Math.random() - 0.5) * 2 * intensity;
      }
    }

    // â”€â”€ Blood particles â”€â”€

    const bGfx = bloodGfx.current;
    if (bGfx) {
      bloodParticles.current = updateBloodParticles(
        bGfx,
        bloodParticles.current,
        dt,
      );
    }

    // â”€â”€ Spark particles â”€â”€

    const sGfx = sparkGfx.current;
    if (sGfx) {
      sparkParticles.current = updateSparkParticles(
        sGfx,
        sparkParticles.current,
        dt,
      );
    }
  });

  return { showWinText, winTextAlpha, winnerText, countdownText, ringAlpha, cpuHitColors };
}
