import { revealableIndices, splitGraphemes } from "../../shared/cloze.js";

export function revealClozeHint(attempt, id) {
  const item = attempt[id];
  if (!item || item.correct) return attempt;

  const revealedSet = new Set(item.revealed);
  const remaining = item.order.filter((index) => !revealedSet.has(index));
  const lettersPerHint = Math.max(1, Math.ceil(item.revealable.length / 4));
  const nextIndices = remaining.slice(0, lettersPerHint);
  if (!nextIndices.length) return attempt;

  return {
    ...attempt,
    [id]: {
      ...item,
      revealed: [...item.revealed, ...nextIndices],
      hintsUsed: item.hintsUsed + 1
    }
  };
}

// Each cloze word owns independent answer, hint, and correctness state.
export function createAttemptState(clozes) {
  return Object.fromEntries(
    clozes.map((item) => [
      item.id,
      {
        ...item,
        value: "",
        correct: false,
        hintsUsed: 0,
        chars: splitGraphemes(item.text),
        revealable: revealableIndices(item.text),
        order: shuffle(revealableIndices(item.text)),
        revealed: []
      }
    ])
  );
}

function shuffle(values) {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

export function normalizeAnswer(value) {
  return value.normalize("NFC").trim().toLocaleLowerCase();
}
