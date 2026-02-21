import type { Phase } from "../types";

/** Map a (character, phase) pair to the correct animation key. */
export function getAnimName(
  char: "player" | "opponent",
  phase: Phase,
): string {
  switch (phase) {
    case "intro":
      return "Idle";
    case "run":
      return "Run";
    case "countdown":
    case "idle":
    case "fight_text":
      return "Idle";
    case "opponent_attack":
      return char === "opponent" ? "Attack_1" : "Idle";
    case "player_hurt":
      return char === "player" ? "Hurt" : "Idle";
    case "player_recover":
      return char === "player" ? "Walk" : "Idle";
    case "player_idle_wait":
      return "Idle";
    case "player_attack":
      return char === "player" ? "Attack_1" : "Idle";
    case "opponent_hurt":
      return char === "opponent" ? "Hurt" : "Idle";
    case "opponent_recover":
      return char === "opponent" ? "Walk" : "Idle";
    case "opponent_idle_wait":
      return "Idle";
    case "clash":
      return "Attack_1";
    case "player_win":
      return char === "opponent" ? "Dead" : "Idle";
    case "player_lose":
      return char === "player" ? "Dead" : "Idle";
  }
}
