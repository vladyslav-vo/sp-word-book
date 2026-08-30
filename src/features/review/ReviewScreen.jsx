import { useMemo, useRef, useState } from "react";
import { ArrowUp, Check, Play } from "lucide-react";
import { RATING_LABELS, RATING_ORDER } from "../../data/defaultData.js";
import { calculateInterval, createReviewSessionIds, getReviewQueue, getSuggestedRating, scheduleCard } from "./scheduling.js";
import { createAttemptState, normalizeAnswer, revealClozeHint } from "./clozeAttempt.js";
import { DocumentRenderer } from "../../editor/DocumentRenderer.jsx";
import { ReviewThemeGraphic } from "../../components/theme/ThemeGraphics.jsx";
import { collectClozes } from "../../shared/cloze.js";
import { formatDateTime, formatInterval } from "../../shared/scheduling.js";
import { ReviewClozeInput } from "./ReviewClozeInput.jsx";
import { useLayerTransition } from "../../components/useLayerTransition.js";

function isNeonTheme(theme) {
  return theme === "neon" || theme === "dark";
}

function ReviewScreenFrame({ theme, children }) {
  return (
    <div className={`review-screen-foreground${isNeonTheme(theme) ? " review-screen-neon" : ""}`}>
      {children}
    </div>
  );
}

function ReviewCardDeck({ cardKey, children, onSettled }) {
  const { settledLayer, transition, activeNode, completeTransition } = useLayerTransition(cardKey, children);

  function finishTransition(event) {
    if (event.target !== event.currentTarget || !completeTransition()) return;
    onSettled();
  }

  if (!transition) {
    return <div className="review-card-deck"><div className="review-card-layer review-card-layer-active" key={settledLayer.key}>{activeNode}</div></div>;
  }

  return (
    <div className="review-card-deck review-card-deck-transitioning" aria-busy="true">
      <div className="review-card-layer review-card-layer-outgoing" key={transition.outgoing.key} aria-hidden="true">{transition.outgoing.node}</div>
      <div className="review-card-layer review-card-layer-incoming" key={transition.incoming.key} onAnimationEnd={finishTransition}>{transition.incoming.node}</div>
    </div>
  );
}

export function ReviewScreen({ cards, settings, forcedCardId = null, onReschedule }) {
  const queueInfo = useMemo(() => getReviewQueue(cards), [cards]);
  const [sessionIds, setSessionIds] = useState(() => (forcedCardId ? createReviewSessionIds(cards, forcedCardId) : []));
  const [position, setPosition] = useState(0);
  const [active, setActive] = useState(Boolean(forcedCardId));
  const [cardTransitioning, setCardTransitioning] = useState(false);
  const cardTransitionLockRef = useRef(false);
  const currentCard = active ? cards.find((card) => card.id === sessionIds[position]) : null;

  function start() { setSessionIds(createReviewSessionIds(cards)); setPosition(0); setActive(true); }
  function finishCard(cardId, scheduling, rating) {
    if (cardTransitionLockRef.current) return;
    if (!onReschedule(cardId, scheduling, rating)) return;
    if (position + 1 < sessionIds.length) {
      cardTransitionLockRef.current = true;
      setCardTransitioning(true);
    }
    setPosition((current) => current + 1);
  }
  function finishCardTransition() {
    cardTransitionLockRef.current = false;
    setCardTransitioning(false);
  }

  if (!active) {
    return <ReviewScreenFrame theme={settings.display.theme}><ReviewLanding queueInfo={queueInfo} theme={settings.display.theme} onStart={start} /></ReviewScreenFrame>;
  }
  if (!currentCard) {
    return <ReviewScreenFrame theme={settings.display.theme}><ReviewComplete queueInfo={queueInfo} theme={settings.display.theme} onExit={() => setActive(false)} /></ReviewScreenFrame>;
  }

  const progress = sessionIds.length ? Math.min((position + 1) / sessionIds.length, 1) : 0;
  return (
    <ReviewScreenFrame theme={settings.display.theme}>
      <section className="review-panel review-session">
        <div className="review-header">
          <div><p className="eyebrow">Focus mode</p><h2>Review</h2><p>{Math.min(position + 1, sessionIds.length)} of {sessionIds.length}</p></div>
          <button className="secondary-button compact-button" type="button" disabled={cardTransitioning} onClick={() => setActive(false)}>Exit review</button>
        </div>
        <div className="review-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div>
        <ReviewCardDeck cardKey={currentCard.id} onSettled={finishCardTransition}>
          {currentCard.type === "basic" ? <BasicReview key={currentCard.id} card={currentCard} settings={settings} onFinish={finishCard} disabled={cardTransitioning} /> : <ClozeReview key={currentCard.id} card={currentCard} settings={settings} onFinish={finishCard} disabled={cardTransitioning} />}
        </ReviewCardDeck>
      </section>
    </ReviewScreenFrame>
  );
}

function ReviewLanding({ queueInfo, theme, onStart }) {
  return (
    <section className="review-panel review-landing">
      <div className="review-landing-copy"><p className="eyebrow">Daily practice</p><h2>Ready to review?</h2><p>Move through the cards due now, one focused answer at a time.</p></div>
      <div className="review-stats"><div><strong>{queueInfo.available.length}</strong><span>due now</span></div><div><strong>{queueInfo.waiting.length}</strong><span>scheduled later</span></div></div>
      <button type="button" disabled={!queueInfo.available.length} onClick={onStart}><Play aria-hidden="true" size={17} />Start review</button>
      {!queueInfo.available.length ? <p className="empty-note">Nothing is due. {queueInfo.nextDue ? `Next card: ${formatDateTime(queueInfo.nextDue)}.` : "Your schedule is clear."}</p> : null}
      <ReviewThemeGraphic theme={theme} variant="landing" />
    </section>
  );
}

function ReviewComplete({ queueInfo, theme, onExit }) {
  return (
    <section className="review-panel review-complete">
      <span className="completion-mark" aria-hidden="true"><Check size={28} /></span>
      <p className="eyebrow">Deck cleared</p><h2>Session complete</h2>
      <p>No cards are due right now. {queueInfo.nextDue ? `Next card: ${formatDateTime(queueInfo.nextDue)}.` : ""}</p>
      <button type="button" onClick={onExit}><ArrowUp aria-hidden="true" size={17} />Return to review overview</button>
      <ReviewThemeGraphic theme={theme} variant="complete" />
    </section>
  );
}

function ClozeReview({ card, settings, onFinish, disabled }) {
  const clozes = useMemo(() => collectClozes(card.content), [card.content]);
  const [attempt, setAttempt] = useState(() => createAttemptState(clozes));
  const [showRating, setShowRating] = useState(false);
  const [checked, setChecked] = useState(false);
  const [checkMessage, setCheckMessage] = useState("");
  const suggestedRating = useMemo(() => getSuggestedRating(attempt), [attempt]);

  function updateValue(id, value) {
    setAttempt((current) => ({
      ...current,
      [id]: {
        ...current[id],
        value,
        correct: normalizeAnswer(value) === normalizeAnswer(current[id].text)
      }
    }));
    setShowRating(false);
    setChecked(false);
    setCheckMessage("");
  }

  function revealHint(id) {
    setAttempt((current) => revealClozeHint(current, id));
  }

  function checkAnswers() {
    const nextAttempt = Object.fromEntries(
      Object.entries(attempt).map(([id, item]) => [
        id,
        {
          ...item,
          correct: normalizeAnswer(item.value) === normalizeAnswer(item.text)
        }
      ])
    );
    const allCorrect = Object.values(nextAttempt).length > 0 && Object.values(nextAttempt).every((item) => item.correct);

    setAttempt(nextAttempt);
    setChecked(true);
    setShowRating(allCorrect);
    setCheckMessage(allCorrect ? "All answers are correct. Choose the next interval." : "Some answers are incorrect. Correct the highlighted fields and check again.");
  }

  return (
    <div className="review-card single-card-review">
      <ReviewThemeGraphic theme={settings.display.theme} />
      <DocumentRenderer
        doc={card.content}
        scope={card.id}
        renderCloze={({ id }) => (
          <ReviewClozeInput
            key={id}
            state={attempt[id]}
            checked={checked}
            showExactWordLength={settings.display.showExactWordLength}
            onAnswer={(value) => updateValue(id, value)}
            onHint={() => revealHint(id)}
          />
        )}
      />
      <div className="review-actions">
        <button type="button" onClick={checkAnswers} disabled={disabled}>Check answers</button>
        {checkMessage ? <p className={showRating ? "status-inline success" : "status-inline error"}>{checkMessage}</p> : null}
      </div>
      {showRating ? <RatingDialog card={card} settings={settings} suggestedRating={suggestedRating} disabled={disabled} onSelect={(rating, interval) => onFinish(card.id, scheduleCard(card, rating, suggestedRating, interval, settings), rating)} /> : null}
    </div>
  );
}
function BasicReview({ card, settings, onFinish, disabled }) {
  const [showBack, setShowBack] = useState(false);
  return (
    <div className="review-card single-card-review">
      <ReviewThemeGraphic theme={settings.display.theme} />
      <div className="card-side-label">Front</div>
      <DocumentRenderer doc={card.front} scope={`${card.id}-front`} />
      {showBack ? (
        <div className="answer-pane">
          <div className="card-side-label">Back</div>
          <DocumentRenderer doc={card.back} scope={`${card.id}-back`} />
          <RatingDialog card={card} settings={settings} suggestedRating={null} disabled={disabled} onSelect={(rating, interval) => onFinish(card.id, scheduleCard(card, rating, null, interval, settings), rating)} />
        </div>
      ) : (
        <button type="button" onClick={() => setShowBack(true)}>Show answer</button>
      )}
    </div>
  );
}


function RatingDialog({ card, settings, suggestedRating, onSelect, disabled }) {
  const intervalByRating = Object.fromEntries(RATING_ORDER.map((rating) => [rating, calculateInterval(card, rating, settings)]));

  return (
    <div className="rating-dialog">
      <div className="rating-heading"><div><p className="eyebrow">Next interval</p><h3>{suggestedRating ? `Recommendation: ${RATING_LABELS[suggestedRating]}` : "Choose a difficulty"}</h3></div>{suggestedRating ? <span className="recommendation-key">Suggested</span> : null}</div>
      {suggestedRating ? <p>The recommendation is based on the average number of hints used.</p> : <p>Rate two-sided cards based on how well you recalled the answer.</p>}
      <div className="rating-buttons">
        {RATING_ORDER.map((rating) => (
          <button
            className={`rating-button rating-${rating}${suggestedRating === rating ? " recommended" : ""}`}
            type="button"
            key={rating}
            disabled={disabled}
            onClick={() => onSelect(rating, intervalByRating[rating])}
          >
            {suggestedRating === rating ? <span className="recommended-mark" aria-hidden="true">✓</span> : null}
            <strong className="rating-label">{RATING_LABELS[rating]}</strong>
            <span className="rating-interval">{formatInterval(intervalByRating[rating])}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
