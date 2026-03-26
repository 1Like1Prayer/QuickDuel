import { useTick } from "@pixi/react";
import { Text } from "pixi.js";
import { useRef } from "react";

import { copies } from "../../../copies";
import type { LayoutFightText } from "../../hooks/types/useLayout.types";

export interface GameTextProps {
  screenWidth: number;
  screenHeight: number;
  fightText: LayoutFightText;
  showWinText: React.RefObject<boolean>;
  winTextAlpha: React.RefObject<number>;
  winnerText: React.RefObject<string>;
  countdownText: React.RefObject<string | null>;
}

/** Countdown and win/lose text overlays. */
export function GameText({
  screenWidth,
  screenHeight,
  fightText,
  showWinText,
  winTextAlpha,
  winnerText,
  countdownText,
}: GameTextProps) {
  const winTextRef = useRef<Text>(null);
  const countdownTextRef = useRef<Text>(null);

  useTick(() => {
    // Update countdown text
    if (countdownTextRef.current) {
      const cdText = countdownText.current;
      countdownTextRef.current.visible = cdText !== null;
      if (cdText !== null) {
        countdownTextRef.current.text = cdText;
      }
    }

    // Update "You Win" / "You Lose" text
    if (winTextRef.current) {
      winTextRef.current.text = winnerText.current;
      winTextRef.current.visible = showWinText.current;
      winTextRef.current.alpha = winTextAlpha.current;
    }
  });

  return (
    <>
      {/* Countdown */}
      <pixiText
        ref={countdownTextRef}
        text={copies.game.countdown.three}
        anchor={0.5}
        x={screenWidth / 2}
        y={screenHeight / 2 - fightText.fightFontSize * 0.8}
        style={{
          fontFamily: "ARCADECLASSIC, Arial Black, Impact, sans-serif",
          fontSize: fightText.fightFontSize * 1.5,
          fontWeight: "bold" as const,
          fill: 0xffffff,
          stroke: { color: 0x000000, width: fightText.fightStrokeWidth * 1.5 },
          dropShadow: {
            alpha: 0.7,
            angle: Math.PI / 4,
            blur: 6,
            distance: 5,
            color: 0x000000,
          },
        }}
        visible={false}
      />

      {/* "You Win" / "You Lose" text fades in after death */}
      <pixiText
        ref={winTextRef}
        text={copies.game.result.youWin}
        anchor={0.5}
        x={screenWidth / 2}
        y={screenHeight * 0.22}
        style={{
          fontFamily: "dpcomic, Arial Black, Impact, sans-serif",
          fontSize: fightText.fightFontSize * 1.8,
          fontWeight: "bold" as const,
          fill: 0xffcc00,
          stroke: { color: 0x000000, width: fightText.fightStrokeWidth * 1.8 },
          dropShadow: {
            alpha: 0.6,
            angle: Math.PI / 4,
            blur: 6,
            distance: 6,
            color: 0x000000,
          },
        }}
        visible={false}
        alpha={0}
      />
    </>
  );
}
