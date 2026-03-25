import type { Difficulty } from "../../../../state";
import { copies } from "../../../../copies";
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
        {copies.difficultySelect.beginner}
      </button>
      <button
        className="intro-btn intro-btn-difficulty intro-btn-intermediate"
        onClick={() => onPick("intermediate")}
      >
        {copies.difficultySelect.intermediate}
      </button>
      <button
        className="intro-btn intro-btn-difficulty intro-btn-advanced"
        onClick={() => onPick("advanced")}
      >
        {copies.difficultySelect.advanced}
      </button>
      <button
        className="intro-btn intro-btn-back"
        onClick={onBack}
      >
        {copies.common.back}
      </button>
    </div>
  );
}
