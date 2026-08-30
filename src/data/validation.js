import { RATING_ORDER } from "./defaultData.js";
import { getDocText } from "../editor/tiptapDocs.js";
import { EDITOR_SCHEMA } from "../editor/editorConfig.js";
import { collectClozes } from "../shared/cloze.js";
import { parseLocalDateKey } from "../shared/date.js";

const REVIEW_RATINGS = RATING_ORDER.filter((rating) => rating !== "veryHard");

function valid() {
  return { ok: true, kind: null, message: "" };
}

function invalid(message, kind = "internal") {
  return { ok: false, kind, message };
}

export function validateTiptapDocument(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.type !== "doc") {
    return invalid("Editor content must be a Tiptap document.");
  }

  try {
    EDITOR_SCHEMA.nodeFromJSON(value).check();
    return valid();
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` ${error.message}` : "";
    return invalid(`Editor content does not match the supported Tiptap schema.${detail}`);
  }
}

export function validateCard(card) {
  if (!card || typeof card !== "object" || Array.isArray(card)) {
    return invalid("A card must be an object.");
  }

  if (typeof card.id !== "string" || !card.id.trim()) {
    return invalid("A card must have a non-empty id.");
  }

  if (card.type === "basic") {
    const frontResult = validateTiptapDocument(card.front);
    if (!frontResult.ok) return invalid(`The front side is invalid. ${frontResult.message}`);
    const backResult = validateTiptapDocument(card.back);
    if (!backResult.ok) return invalid(`The back side is invalid. ${backResult.message}`);
    if (!getDocText(card.front)) return invalid("A two-sided card must have a front side.", "user");
    if (!getDocText(card.back)) return invalid("A two-sided card must have a back side.", "user");
  } else if (card.type === "cloze") {
    const documentResult = validateTiptapDocument(card.content);
    if (!documentResult.ok) return documentResult;
    if (!getDocText(card.content)) return invalid("A cloze card must contain text.", "user");

    const clozes = collectClozes(card.content);
    const ids = clozes.map((item) => item.id);
    if (!clozes.length) return invalid("A cloze card must contain at least one cloze deletion.", "user");
    if (ids.some((id) => typeof id !== "string" || !id.trim())) {
      return invalid("A cloze deletion must have a non-empty id.");
    }
    if (new Set(ids).size !== ids.length) {
      // Adjacent fragments form one range; a repeated range elsewhere would merge independent answers.
      return invalid("A cloze card contains duplicate cloze ids.");
    }
  } else {
    return invalid("A card has an unknown type.");
  }

  return validateScheduling(card.scheduling);
}

export function validateSettings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return invalid("Settings must be an object.");
  }

  if (!settings.display || !["morning", "neon", "light", "dark"].includes(settings.display.theme)) {
    return invalid("Display theme must be Morning Mojito or Neon Streets.");
  }
  if (typeof settings.display.showExactWordLength !== "boolean") {
    return invalid("The exact-word-length setting must be boolean.");
  }

  const learning = settings.scheduling?.learningIntervalsMinutes;
  const multipliers = settings.scheduling?.reviewMultipliers;
  if (!learning || !multipliers) return invalid("Scheduling settings are incomplete.");

  for (const rating of RATING_ORDER) {
    if (!Number.isFinite(learning[rating]) || learning[rating] <= 0) {
      return invalid(`The ${rating} learning interval must be a positive number.`, "user");
    }
  }

  for (const rating of REVIEW_RATINGS) {
    if (!Number.isFinite(multipliers[rating]) || multipliers[rating] < 1) {
      return invalid(`The ${rating} review multiplier must be at least 1.`, "user");
    }
  }

  return valid();
}

export function validateScheduling(scheduling) {
  if (!scheduling || typeof scheduling !== "object" || Array.isArray(scheduling)) {
    return invalid("Card scheduling must be an object.");
  }
  if (!["new", "review"].includes(scheduling.phase)) return invalid("Scheduling phase is invalid.");
  if (scheduling.intervalMinutes !== null && (!Number.isFinite(scheduling.intervalMinutes) || scheduling.intervalMinutes <= 0)) {
    return invalid("Scheduling interval must be null or a positive number.");
  }

  for (const field of ["dueAt", "lastReviewedAt"]) {
    const value = scheduling[field];
    if (value !== null && (typeof value !== "string" || Number.isNaN(Date.parse(value)))) {
      return invalid(`Scheduling ${field} must be null or a valid timestamp.`);
    }
  }

  for (const field of ["reviewCount", "lapseCount"]) {
    if (!Number.isInteger(scheduling[field]) || scheduling[field] < 0) {
      return invalid(`Scheduling ${field} must be a non-negative integer.`);
    }
  }

  for (const field of ["lastSuggestedRating", "lastSelectedRating"]) {
    const value = scheduling[field];
    if (value !== null && !RATING_ORDER.includes(value)) return invalid(`Scheduling ${field} is invalid.`);
  }

  return valid();
}

export function validatePersistentState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return invalid("Persistent state must be an object.");
  }
  if (state.schemaVersion !== 4) return invalid("Persistent state must use schemaVersion 4.");

  const settingsResult = validateSettings(state.settings);
  if (!settingsResult.ok) return settingsResult;
  if (!Array.isArray(state.cards)) return invalid("Persistent cards must be an array.");

  const ids = new Set();
  for (const card of state.cards) {
    const cardResult = validateCard(card);
    if (!cardResult.ok) return cardResult;
    if (ids.has(card.id)) return invalid(`Persistent state contains duplicate card id "${card.id}".`);
    ids.add(card.id);
  }

  if (!state.statistics || !Array.isArray(state.statistics.daily)) {
    return invalid("Persistent statistics.daily must be an array.");
  }

  const dates = new Set();
  for (const entry of state.statistics.daily) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return invalid("A daily statistics entry must be an object.");
    if (typeof entry.date !== "string" || !parseLocalDateKey(entry.date)) return invalid("A daily statistics date must use a valid YYYY-MM-DD local date key.");
    if (dates.has(entry.date)) return invalid(`Persistent statistics contains duplicate date "${entry.date}".`);
    dates.add(entry.date);
    for (const field of ["newCards", "reviews"]) {
      if (!Number.isInteger(entry[field]) || entry[field] < 0) return invalid(`Daily statistics ${field} must be a non-negative integer.`);
    }
    if (!entry.ratings || typeof entry.ratings !== "object" || Array.isArray(entry.ratings)) return invalid("Daily statistics ratings must be an object.");
    for (const rating of RATING_ORDER) {
      if (!Number.isInteger(entry.ratings[rating]) || entry.ratings[rating] < 0) return invalid(`Daily statistics rating ${rating} must be a non-negative integer.`);
    }
  }

  return valid();
}
