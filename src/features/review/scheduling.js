import { createScheduling } from "../../shared/scheduling.js";

const SUGGESTION_BY_LEVEL = ["veryEasy", "easy", "medium", "hard", "veryHard"];

export function getReviewQueue(cards, now = Date.now()) {
  const available = [];
  const waiting = [];

  cards.forEach((card, index) => {
    const dueAt = card.scheduling?.dueAt;
    const time = dueAt ? new Date(dueAt).getTime() : null;
    const item = { ...card, originalIndex: index };

    if (time === null || Number.isNaN(time) || time <= now) available.push(item);
    else waiting.push(item);
  });

  available.sort((a, b) => queueRank(a, now) - queueRank(b, now) || dueTime(a) - dueTime(b) || a.originalIndex - b.originalIndex);
  waiting.sort((a, b) => dueTime(a) - dueTime(b));

  return { available, waiting, nextDue: waiting[0]?.scheduling?.dueAt || null };
}

export function createReviewSessionIds(cards, forcedCardId = null, now = Date.now()) {
  const dueIds = getReviewQueue(cards, now).available.map((card) => card.id);
  if (!forcedCardId) return dueIds;
  if (!cards.some((card) => card.id === forcedCardId)) return dueIds;
  return [forcedCardId, ...dueIds.filter((cardId) => cardId !== forcedCardId)];
}

export function getSuggestedRating(attempt) {
  const items = Object.values(attempt);
  if (!items.length) return "veryEasy";

  const average = items.reduce((sum, item) => sum + item.hintsUsed, 0) / items.length;
  const level = Math.min(4, Math.max(0, Math.ceil(average)));
  return SUGGESTION_BY_LEVEL[level];
}

export function calculateInterval(card, rating, settings) {
  const scheduling = createScheduling(card.scheduling || {});

  if (scheduling.phase === "new") return settings.scheduling.learningIntervalsMinutes[rating];
  if (rating === "veryHard") return settings.scheduling.learningIntervalsMinutes.veryHard;

  const previous = Math.max(1, scheduling.intervalMinutes || settings.scheduling.learningIntervalsMinutes.medium);
  return Math.max(1, Math.round(previous * settings.scheduling.reviewMultipliers[rating]));
}

export function scheduleCard(card, selectedRating, suggestedRating, intervalMinutes, settings) {
  const previous = createScheduling(card.scheduling || {});
  const nextInterval = intervalMinutes ?? calculateInterval(card, selectedRating, settings);
  const now = new Date();
  const nextPhase = selectedRating === "veryHard" ? "new" : "review";

  return {
    phase: previous.phase === "new" && selectedRating === "veryHard" ? "new" : nextPhase,
    intervalMinutes: nextInterval,
    dueAt: new Date(Date.now() + nextInterval * 60000).toISOString(),
    lastReviewedAt: now.toISOString(),
    reviewCount: previous.reviewCount + 1,
    lapseCount: previous.lapseCount + (previous.phase === "review" && selectedRating === "veryHard" ? 1 : 0),
    lastSuggestedRating: suggestedRating,
    lastSelectedRating: selectedRating
  };
}

function queueRank(card, now) {
  if (!card.scheduling?.dueAt) return 1;
  return new Date(card.scheduling.dueAt).getTime() <= now ? 0 : 2;
}

function dueTime(card) {
  return card.scheduling?.dueAt ? new Date(card.scheduling.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
}
