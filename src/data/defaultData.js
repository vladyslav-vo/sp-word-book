export const CARD_TYPE_LABELS = {
  cloze: "Cloze",
  basic: "Two-sided"
};

export const RATING_LABELS = {
  veryHard: "Very hard",
  hard: "Hard",
  medium: "Medium",
  easy: "Easy",
  veryEasy: "Very easy"
};

export const RATING_ORDER = ["veryHard", "hard", "medium", "easy", "veryEasy"];

const DEFAULT_SETTINGS = {
  display: {
    theme: "morning",
    showExactWordLength: true
  },
  scheduling: {
    learningIntervalsMinutes: {
      veryHard: 1,
      hard: 15,
      medium: 1440,
      easy: 2880,
      veryEasy: 5760
    },
    reviewMultipliers: {
      hard: 1.2,
      medium: 2,
      easy: 2.7,
      veryEasy: 3.5
    }
  }
};

export function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}
