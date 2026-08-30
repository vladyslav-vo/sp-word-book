import { useState } from "react";
import { validateCard, validatePersistentState, validateScheduling, validateSettings } from "../data/validation.js";
import { recordReviewStatistics } from "../features/statistics/statistics.js";
import { areJsonEqual, cloneJson } from "../shared/json.js";

function operationError(operation, result) {
  return result.kind === "user" ? result.message : `Internal error while ${operation}: ${result.message}`;
}

export function useCollectionState(initialData, { setMessage, setError }) {
  const [persistentState, setPersistentState] = useState(initialData);
  const [collectionDirty, setCollectionDirty] = useState(false);

  function commitPersistentState(candidate, operation) {
    // Persistent state is validated before React receives it, so invalid candidates never replace valid data.
    const validation = validatePersistentState(candidate);
    if (!validation.ok) {
      setMessage("");
      setError(operationError(operation, validation));
      return false;
    }

    if (!areJsonEqual(candidate, persistentState)) {
      setPersistentState(candidate);
      setCollectionDirty(true);
    }
    return true;
  }

  function saveCard(editorSession) {
    const cardValidation = validateCard(editorSession.draft);
    if (!cardValidation.ok) {
      setMessage("");
      setError(operationError("saving card", cardValidation));
      return false;
    }

    let candidateCards;
    if (editorSession.isNew) {
      candidateCards = [cloneJson(editorSession.draft), ...persistentState.cards];
    } else {
      const originalId = editorSession.original.id;
      if (!persistentState.cards.some((card) => card.id === originalId)) {
        setError(`Internal error while saving card: card "${originalId}" no longer exists.`);
        return false;
      }
      if (editorSession.draft.id !== originalId) {
        setError("Internal error while saving card: editing changed the card id.");
        return false;
      }
      candidateCards = persistentState.cards.map((card) => (card.id === originalId ? cloneJson(editorSession.draft) : card));
    }

    const candidate = { ...persistentState, cards: candidateCards };
    if (!commitPersistentState(candidate, "saving card")) return false;
    setError("");
    setMessage("Card saved to the in-memory collection. Download an updated HTML file to keep it.");
    return true;
  }

  function deleteCard(cardId) {
    if (!persistentState.cards.some((card) => card.id === cardId)) {
      setError(`Internal error while deleting card: card "${cardId}" was not found.`);
      return false;
    }

    const candidate = { ...persistentState, cards: persistentState.cards.filter((card) => card.id !== cardId) };
    if (!commitPersistentState(candidate, "deleting card")) return false;
    setMessage("Card deleted.");
    setError("");
    return true;
  }

  function updateSettings(updater) {
    const nextSettings = typeof updater === "function" ? updater(persistentState.settings) : updater;
    const settingsValidation = validateSettings(nextSettings);
    if (!settingsValidation.ok) {
      setMessage("");
      setError(operationError("changing settings", settingsValidation));
      return false;
    }

    const candidate = { ...persistentState, settings: nextSettings };
    if (!commitPersistentState(candidate, "changing settings")) return false;
    setError("");
    setMessage("Settings updated in memory. Download an updated HTML file to keep them.");
    return true;
  }

  function rescheduleCard(cardId, scheduling, rating) {
    const schedulingValidation = validateScheduling(scheduling);
    if (!schedulingValidation.ok) {
      setMessage("");
      setError(operationError("finishing review", schedulingValidation));
      return false;
    }

    const card = persistentState.cards.find((item) => item.id === cardId);
    if (!card) {
      setError(`Internal error while finishing review: card "${cardId}" was not found.`);
      return false;
    }

    const candidate = {
      ...persistentState,
      cards: persistentState.cards.map((item) => (item.id === cardId ? { ...item, scheduling } : item)),
      // The old count is authoritative here: scheduleCard has already incremented the returned count.
      statistics: recordReviewStatistics(persistentState.statistics, { isNew: card.scheduling.reviewCount === 0, rating })
    };
    if (!commitPersistentState(candidate, "finishing review")) return false;
    setError("");
    setMessage("Review result updated in memory. Download an updated HTML file to keep it.");
    return true;
  }

  return {
    persistentState,
    collectionDirty,
    saveCard,
    deleteCard,
    updateSettings,
    rescheduleCard
  };
}
