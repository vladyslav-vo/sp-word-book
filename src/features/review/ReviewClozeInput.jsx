import { getClozeContentWidth, getClozeMask } from "../../shared/cloze.js";

export function ReviewClozeInput({ state, checked, showExactWordLength, onAnswer, onHint }) {
  if (!state) return <span className="review-cloze missing">cloze state error</span>;

  function handleHintClick(event) {
    event.preventDefault();
    event.stopPropagation();
    onHint();
  }

  return (
    <span
      className="review-cloze"
      data-hints={state.hintsUsed}
      style={{ "--cloze-content-width": getClozeContentWidth(state, showExactWordLength) }}
    >
      <button type="button" className="cloze-mask" disabled={state.correct} onClick={handleHintClick} aria-label={`Reveal a cloze hint; ${state.hintsUsed} used`}>
        {getClozeMask(state, showExactWordLength)}
      </button>
      <input
        className={checked && !state.correct ? "wrong" : state.correct ? "correct" : ""}
        value={state.value}
        disabled={state.correct}
        onChange={(event) => onAnswer(event.target.value)}
        aria-label="Cloze answer"
      />
      <span className="hint-counter">{state.hintsUsed}</span>
    </span>
  );
}
