import { useGameStore } from "../../state";
import "./EndScreen.css";

export function EndScreen() {
  const playAgain = useGameStore((s) => s.playAgain);
  const reset = useGameStore((s) => s.reset);

  return (
    <div className="end-screen" onPointerDown={(e) => e.stopPropagation()}>
      <div className="end-content">
        <button
          className="end-btn end-btn-play-again"
          onClick={(e) => {
            e.stopPropagation();
            playAgain();
          }}
        >
          Play Again
        </button>
        <button
          className="end-btn end-btn-main-menu"
          onClick={(e) => {
            e.stopPropagation();
            reset();
          }}
        >
          Main Menu
        </button>
      </div>
    </div>
  );
}
