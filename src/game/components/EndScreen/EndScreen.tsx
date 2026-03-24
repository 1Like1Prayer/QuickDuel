import { useGameStore } from "../../../state";
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
          className={`end-btn ${playerWon ? "end-btn-win" : "end-btn-lose"}`}
          onClick={() => playAgain()}
        >
          Play Again
        </button>
        <button
          className="end-btn end-btn-main-menu"
          onClick={() => reset()}
        >
          Main Menu
        </button>
      </div>
    </div>
  );
}
