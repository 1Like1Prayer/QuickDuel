import { useGameStore } from "../../../state";
import { copies } from "../../../copies";
import "./EndScreen.css";

export function EndScreen() {
  const playAgain = useGameStore((s) => s.playAgain);
  const reset = useGameStore((s) => s.reset);
  const score = useGameStore((s) => s.score);

  const playerWon = score > 0;

  return (
    <div className="end-screen" onPointerDown={(e) => e.stopPropagation()}>
      <div className="end-content">
        <button
          className={`intro-btn ${playerWon ? "end-btn-win" : "end-btn-lose"}`}
          onClick={() => playAgain()}
        >
          {copies.endScreen.playAgain}
        </button>
        <button
          className="intro-btn end-btn-main-menu"
          onClick={() => reset()}
        >
          {copies.endScreen.mainMenu}
        </button>
      </div>
    </div>
  );
}
