import type { Phase } from "../types";

/** Map a (character, phase) pair to the correct spritesheet animation key.
 *
 *  The returned string must match one of the keys in the `CharAnims` record
 *  loaded by `useCharacterAnims` (e.g. "Idle", "Flame_jet", "Dead"). */
export function getAnimName(
  character: "player" | "opponent",
  phase: Phase,
): string {
  switch (phase) {
    case "intro":
    case "countdown":
    case "idle":
    case "fight_text":
      return "Idle";
    case "attack_intro":
      // Each character has a unique casting animation
      return character === "player" ? "Flame_jet" : "Magic_arrow";
    case "player_win":
      // Winner idles, loser plays death animation
      return character === "opponent" ? "Dead" : "Idle";
    case "player_lose":
      return character === "player" ? "Dead" : "Idle";
  }
}
