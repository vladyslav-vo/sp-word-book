import { useEffect, useMemo, useState } from "react";
import { BarChart3, Brain, Download, Layers3, Plus, Settings } from "lucide-react";
import { createUpdatedHtml, readInitialData } from "../data/data.js";
import { downloadHtml, getDefaultHtmlFilename, normalizeHtmlFilename } from "../data/download.js";
import { createBlankCard, isCardMeaningful } from "../features/cards/cards.js";
import { validatePersistentState } from "../data/validation.js";
import { SettingsPanel } from "../features/settings/SettingsPanel.jsx";
import { ReviewScreen } from "../features/review/ReviewScreen.jsx";
import { NeonThemeBackground } from "../components/theme/NeonThemeBackground.jsx";
import { CardsScreen } from "../features/cards/CardsScreen.jsx";
import { PageThemeGraphic, ThemeSignature } from "../components/theme/ThemeGraphics.jsx";
import { StatsScreen } from "../features/statistics/StatsScreen.jsx";
import { DeckTransition } from "../components/DeckTransition.jsx";
import { useCollectionState } from "./useCollectionState.js";
import { useViewNavigation } from "./useViewNavigation.js";
import { areJsonEqual, cloneJson } from "../shared/json.js";

function collectionNameFromLocation() {
  try {
    const rawName = window.location.pathname.split("/").filter(Boolean).pop() || "";
    const filename = decodeURIComponent(rawName).replace(/\.html$/i, "");
    return filename && filename.toLowerCase() !== "index" ? filename : "My flashcards";
  } catch {
    return "My flashcards";
  }
}

function App() {
  const initialState = useMemo(() => readInitialData(), []);
  const [editorSession, setEditorSession] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [forcedReviewCardId, setForcedReviewCardId] = useState(null);
  const {
    persistentState,
    collectionDirty,
    saveCard: saveCardToCollection,
    deleteCard: deleteCardFromCollection,
    updateSettings,
    rescheduleCard
  } = useCollectionState(initialState.data, { setMessage, setError });
  const {
    screen,
    setScreen,
    transitionDirection,
    isScreenTransitioning,
    beginViewTransition,
    finishViewTransition,
    isTransitionLocked
  } = useViewNavigation();
  const collectionName = useMemo(collectionNameFromLocation, []);

  const draftDirty = editorSession ? !areJsonEqual(editorSession.draft, editorSession.original) : false;
  const meaningfulDraft = editorSession
    ? editorSession.isNew
      ? isCardMeaningful(editorSession.draft)
      : draftDirty
    : false;
  const hasUnsavedWork = collectionDirty || meaningfulDraft;

  useEffect(() => {
    const theme = persistentState?.settings?.display?.theme;
    if (theme) document.body.dataset.theme = theme === "dark" ? "neon" : theme === "light" ? "morning" : theme;
  }, [persistentState?.settings?.display?.theme]);

  useEffect(() => {
    document.title = collectionName;
  }, [collectionName]);

  useEffect(() => {
    if (!hasUnsavedWork) return undefined;

    function warnBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedWork]);

  function clearNotices() {
    setError("");
    setMessage("");
  }

  function discardEditorWithGuard(action) {
    if (!editorSession) return true;
    if (meaningfulDraft && !window.confirm(`${action} will discard the unsaved card draft. Continue?`)) return false;
    setEditorSession(null);
    return true;
  }

  function startCreateCard() {
    if (isTransitionLocked()) return;
    if (!discardEditorWithGuard("Starting a new card")) return;
    if (!beginViewTransition("edit")) return;
    const draft = createBlankCard("basic");
    setEditorSession({ draft, original: cloneJson(draft), isNew: true });
    setForcedReviewCardId(null);
    setScreen("cards");
    clearNotices();
  }

  function startEditCard(card) {
    if (isTransitionLocked()) return;
    if (!discardEditorWithGuard("Editing another card")) return;
    if (!beginViewTransition("edit")) return;
    const original = cloneJson(card);
    setEditorSession({ draft: cloneJson(card), original, isNew: false });
    setForcedReviewCardId(null);
    setScreen("cards");
    clearNotices();
  }

  function updateDraft(draft) {
    setEditorSession((current) => (current ? { ...current, draft } : current));
  }

  function cancelEdit() {
    if (isTransitionLocked()) return;
    if (!discardEditorWithGuard("Cancelling")) return;
    if (!beginViewTransition("cards")) return;
    clearNotices();
  }

  function navigate(nextScreen) {
    if (isTransitionLocked()) return;
    if (nextScreen === screen && !editorSession) return;
    if (!discardEditorWithGuard(`Opening ${nextScreen}`)) return;
    if (!beginViewTransition(nextScreen)) return;
    setForcedReviewCardId(null);
    setScreen(nextScreen);
    clearNotices();
  }

  function startForcedReview(cardId) {
    if (isTransitionLocked()) return;
    if (!persistentState.cards.some((card) => card.id === cardId)) {
      setError(`Internal error while starting review: card "${cardId}" was not found.`);
      return;
    }
    if (!discardEditorWithGuard("Starting review")) return;
    if (!beginViewTransition("review")) return;
    setForcedReviewCardId(cardId);
    setScreen("review");
    clearNotices();
  }

  function deleteCard(cardId) {
    const editingThisCard = editorSession && !editorSession.isNew && editorSession.original.id === cardId;
    const prompt = editingThisCard && meaningfulDraft
      ? "Discard the unsaved draft and delete this card?"
      : "Delete this card?";
    if (!window.confirm(prompt)) return;

    if (!deleteCardFromCollection(cardId)) return;
    if (editingThisCard) setEditorSession(null);
  }

  function saveCard() {
    if (isTransitionLocked()) return;
    if (!editorSession) return;
    if (!saveCardToCollection(editorSession)) return;
    if (!beginViewTransition("cards")) return;
    setEditorSession(null);
  }

  function handleDownload() {
    if (meaningfulDraft) {
      setMessage("");
      setError("Save or cancel the current card draft before downloading the collection.");
      return;
    }

    try {
      if (editorSession) setEditorSession(null);
      const requestedName = window.prompt("File name for this collection:", getDefaultHtmlFilename());
      if (requestedName === null) return;
      const filename = normalizeHtmlFilename(requestedName);
      const validation = validatePersistentState(persistentState);
      if (!validation.ok) throw new Error(`persistent data validation failed: ${validation.message}`);

      const html = createUpdatedHtml(persistentState);
      downloadHtml(html, filename);
      setError("");
      setMessage(`Download of "${filename}" was initiated. The browser cannot confirm whether the file was saved.`);
      // A normal download cannot prove that the user completed the save, so collectionDirty remains truthful.
    } catch (downloadError) {
      setMessage("");
      setError(`Could not generate the updated HTML file: ${downloadError.message}`);
    }
  }

  if (initialState.fatalError || !persistentState) {
    return (
      <main className="app-shell">
        <header className="topbar"><div><h1>{collectionName}</h1><ThemeSignature theme="morning" /></div></header>
        <p className="status status-error" role="alert">{initialState.fatalError || "Persistent data is unavailable."}</p>
      </main>
    );
  }

  const saveStateText = meaningfulDraft && collectionDirty
    ? "Unsaved card draft and collection changes"
    : meaningfulDraft
      ? "Unsaved card draft"
      : collectionDirty
        ? "Unsaved collection changes"
        : draftDirty
          ? "Empty card draft changed"
        : "Collection loaded";

  const currentView = editorSession ? "edit" : screen;
  const currentTheme = persistentState.settings.display.theme;
  let screenContent;

  switch (screen) {
    case "settings":
      screenContent = <SettingsPanel settings={persistentState.settings} onChange={updateSettings} />;
      break;
    case "stats":
      screenContent = <StatsScreen statistics={persistentState.statistics} />;
      break;
    case "review":
      screenContent = <ReviewScreen cards={persistentState.cards} settings={persistentState.settings} forcedCardId={forcedReviewCardId} onReschedule={rescheduleCard} />;
      break;
    default:
      screenContent = (
        <CardsScreen
          cards={persistentState.cards}
          settings={persistentState.settings}
          editingCard={editorSession?.draft || null}
          onChangeDraft={updateDraft}
          onCancel={cancelEdit}
          onEdit={startEditCard}
          onDelete={deleteCard}
          onForceReview={startForcedReview}
          onSave={saveCard}
          onError={setError}
        />
      );
  }

  return (
    <>
      <NeonThemeBackground theme={currentTheme} />
      <main className="app-shell">
      <PageThemeGraphic theme={currentTheme} />
      <header className="topbar">
        <div className="collection-heading">
          <h1 title={collectionName}>{collectionName}</h1>
          <ThemeSignature theme={currentTheme} />
          <p className={hasUnsavedWork ? "save-state unsaved" : "save-state"}>{saveStateText}</p>
        </div>
        <div className="top-actions">
          <button className="secondary-button download-button" type="button" onClick={handleDownload}><Download aria-hidden="true" size={17} />Download HTML</button>
        </div>
      </header>

      {import.meta.env.DEV ? <p className="dev-notice">Development mode. Run npm run build before testing downloaded files.</p> : null}
      <nav className="screen-tabs" aria-label="Main sections">
        <button className={screen === "cards" && !editorSession ? "active" : ""} type="button" disabled={isScreenTransitioning} onClick={() => navigate("cards")}><Layers3 aria-hidden="true" size={17} />Cards</button>
        <button className={screen === "review" ? "active" : ""} type="button" disabled={isScreenTransitioning} onClick={() => navigate("review")}><Brain aria-hidden="true" size={17} />Review</button>
        <button className={screen === "stats" ? "active" : ""} type="button" disabled={isScreenTransitioning} onClick={() => navigate("stats")}><BarChart3 aria-hidden="true" size={17} />Stats</button>
        <button className={screen === "settings" ? "active" : ""} type="button" disabled={isScreenTransitioning} onClick={() => navigate("settings")}><Settings aria-hidden="true" size={17} />Settings</button>
      </nav>
      {error ? <p className="status status-error" role="alert">{error}</p> : null}
      {message ? <p className="status status-success" role="status">{message}</p> : null}

      <DeckTransition viewKey={currentView} direction={transitionDirection} onSettled={finishViewTransition}>{screenContent}</DeckTransition>
      {screen === "cards" && !editorSession ? <button className="add-fab" type="button" disabled={isScreenTransitioning} onClick={startCreateCard}><Plus aria-hidden="true" size={25} /><span>Add card</span></button> : null}
      </main>
    </>
  );
}

export default App;
