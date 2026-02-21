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
    case "player_win":
      return char === "opponent" ? "Dead" : "Idle";
    case "player_lose":
      return char === "player" ? "Dead" : "Idle";
  }
}
