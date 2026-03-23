import type { Difficulty } from "../../../../state";
import "./DifficultySelect.css";

interface DifficultySelectProps {
  onPick: (difficulty: Difficulty) => void;
  onBack: () => void;
}

export function DifficultySelect({ onPick, onBack }: DifficultySelectProps) {
  return (
    <div className="intro-buttons">
      <button
        className="intro-btn intro-btn-difficulty intro-btn-beginner"
        onClick={() => onPick("beginner")}
      >
        Beginner
      </button>
      <button
        className="intro-btn intro-btn-difficulty intro-btn-intermediate"
        onClick={() => onPick("intermediate")}
      >
        Intermediate
      </button>
      <button
        className="intro-btn intro-btn-difficulty intro-btn-advanced"
        onClick={() => onPick("advanced")}
      >
        Advanced
      </button>
      <button
        className="intro-btn intro-btn-back"
        onClick={onBack}
      >
        Back
      </button>
    </div>
  );
}
