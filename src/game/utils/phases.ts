import type { Phase } from "../types";

/** Map a (character, phase) pair to the correct animation key. */
export function getAnimName(
  char: "player" | "opponent",
  phase: Phase,
): string {
  switch (phase) {
    case "intro":
      return "Idle";
    case "countdown":
    case "idle":
    case "fight_text":
      return "Idle";
    case "attack_intro":
      return char === "player" ? "Flame_jet" : "Magic_arrow";
    case "opponent_attack":
      return char === "opponent" ? "Magic_arrow" : "Idle";
    case "player_hurt":
      return char === "player" ? "Hurt" : "Idle";
    case "player_idle_wait":
      return "Idle";
    case "player_attack":
      return char === "player" ? "Flame_jet" : "Idle";
    case "opponent_hurt":
      return char === "opponent" ? "Hurt" : "Idle";
    case "opponent_idle_wait":
      return "Idle";
    case "clash":
      return char === "player" ? "Flame_jet" : "Magic_arrow";
    case "player_win":
      return char === "opponent" ? "Dead" : "Idle";
    case "player_lose":
      return char === "player" ? "Dead" : "Idle";
  }
}
