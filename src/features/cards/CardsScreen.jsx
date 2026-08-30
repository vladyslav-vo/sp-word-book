import { useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { CARD_TYPE_LABELS } from "../../data/defaultData.js";
import { createBlankCard, isCardMeaningful } from "./cards.js";
import { formatReviewTiming } from "../../shared/scheduling.js";
import { CardListPreview, Preview } from "../../editor/Preview.jsx";
import { RichTextEditor } from "../../editor/RichTextEditor.jsx";
import { EmptyThemeGraphic } from "../../components/theme/ThemeGraphics.jsx";

export function CardsScreen({ cards, settings, editingCard, onChangeDraft, onCancel, onEdit, onDelete, onForceReview, onSave, onError }) {
  if (editingCard) {
    return (
      <CardEditor
        card={editingCard}
        settings={settings}
        onChange={onChangeDraft}
        onCancel={onCancel}
        onSave={onSave}
        onError={onError}
      />
    );
  }

  return <CardList cards={cards} settings={settings} onEdit={onEdit} onDelete={onDelete} onForceReview={onForceReview} />;
}

function CardList({ cards, settings, onEdit, onDelete, onForceReview }) {
  if (!cards.length) {
    return (
      <section className="empty-state empty-state-cards">
        <EmptyThemeGraphic theme={settings.display.theme} />
        <h2>Your deck is ready</h2>
        <p>No cards yet. Add the first word you want to remember.</p>
      </section>
    );
  }

  return (
    <section className="card-list" aria-label="Card list">
      {cards.map((card, index) => {
        const timing = formatReviewTiming(card.scheduling);
        return (
          <article className="card-row" key={card.id}>
            <span className="card-marker" aria-hidden="true" />
            <div className="card-row-main">
              <div className="card-preview-heading">
                <CardListPreview card={card} settings={settings} />
                <span className="card-kind">{CARD_TYPE_LABELS[card.type]}</span>
              </div>
            </div>
            <div className="card-row-actions">
              <button className="icon-button force-review-button" type="button" title="Force review" aria-label={`Force review card ${index + 1}`} onClick={() => onForceReview(card.id)}>
                <Eye aria-hidden="true" size={19} strokeWidth={1.8} />
              </button>
              <button className="icon-button" type="button" title="Edit card" aria-label={`Edit card ${index + 1}`} onClick={() => onEdit(card)}>
                <Pencil aria-hidden="true" size={17} strokeWidth={1.8} />
              </button>
              <button className="icon-button danger-button" type="button" title="Delete card" aria-label={`Delete card ${index + 1}`} onClick={() => onDelete(card.id)}>
                <Trash2 aria-hidden="true" size={17} strokeWidth={1.8} />
              </button>
            </div>
            <div className="card-review-timing" aria-label="Review schedule">
              <div className="review-meta-pill review-meta-last"><span>Last review</span><strong>{timing.lastReview}</strong></div>
              <div className="review-meta-pill review-meta-next"><span>Next</span><strong>{timing.nextReview}</strong></div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function CardEditor({ card, settings, onChange, onCancel, onSave, onError }) {
  const [mode, setMode] = useState("edit");
  const [basicSide, setBasicSide] = useState("front");
  const currentDoc = card.type === "basic" ? card[basicSide] : card.content;
  const editorKey = `${card.id}-${card.type}-${basicSide}`;

  function updateCard(patch) {
    const nextCard = { ...card, ...patch };
    onChange(nextCard);
  }

  function changeType(nextType) {
    if (nextType === card.type) return;

    if (isCardMeaningful(card)) {
      const accepted = window.confirm(
        "Changing card type clears the current type-specific content. The persistent card is not changed until Save. Continue?"
      );
      if (!accepted) return;
    }

    onChange(createBlankCard(nextType, card));
    setMode("edit");
    setBasicSide("front");
    onError("");
  }

  return (
    <section className="editor-panel" aria-label="Card editor">
      <header className="editor-heading">
        <div>
          <p className="eyebrow">Card workspace</p>
          <h2>{card.type === "basic" ? "Two-sided card" : "Cloze card"}</h2>
        </div>
        <label className="editor-type">
          <span>Card type</span>
          <select value={card.type} onChange={(event) => changeType(event.target.value)}>
            <option value="cloze">Cloze</option>
            <option value="basic">Two-sided</option>
          </select>
        </label>
      </header>
      <div className="segmented-control mode-tabs">
        <button className={mode === "edit" ? "active" : ""} type="button" onClick={() => setMode("edit")}>Editor</button>
        <button className={mode === "preview" ? "active" : ""} type="button" onClick={() => setMode("preview")}>Preview</button>
      </div>
      {card.type === "basic" ? (
        <div className="segmented-control side-tabs">
          <button className={basicSide === "front" ? "active" : ""} type="button" onClick={() => setBasicSide("front")}>Front</button>
          <button className={basicSide === "back" ? "active" : ""} type="button" onClick={() => setBasicSide("back")}>Back</button>
        </div>
      ) : null}
      {mode === "edit" ? (
        <RichTextEditor
          key={editorKey}
          content={currentDoc}
          allowCloze={card.type === "cloze"}
          onError={onError}
          onChange={(doc) => (card.type === "basic" ? updateCard({ [basicSide]: doc }) : updateCard({ content: doc }))}
        />
      ) : <Preview card={card} settings={settings} />}
      <div className="editor-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
        <button type="button" onClick={onSave}>Save card</button>
      </div>
    </section>
  );
}
