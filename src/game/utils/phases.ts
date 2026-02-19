import type { CharAnims, Phase } from "../types";

/** Map a (character, phase) pair to the correct animation key. */
export function getAnimName(
  char: "samurai" | "shinobi",
  phase: Phase,
): keyof CharAnims {
  switch (phase) {
    case "intro":
      return "Idle";
    case "run":
      return "Run";
    case "countdown":
    case "idle":
    case "fight_text":
      return "Idle";
    case "shinobi_attack":
      return char === "shinobi" ? "Attack_1" : "Idle";
    case "samurai_hurt":
      return char === "samurai" ? "Hurt" : "Idle";
    case "samurai_recover":
      return char === "samurai" ? "Walk" : "Idle";
    case "samurai_idle_wait":
      return "Idle";
    case "samurai_attack":
      return char === "samurai" ? "Attack_1" : "Idle";
    case "shinobi_hurt":
      return char === "shinobi" ? "Hurt" : "Idle";
    case "shinobi_recover":
      return char === "shinobi" ? "Walk" : "Idle";
    case "shinobi_idle_wait":
      return "Idle";
    case "clash":
      return "Attack_1";
    case "player_win":
      return char === "shinobi" ? "Dead" : "Idle";
  }
}
