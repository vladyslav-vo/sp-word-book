import { useState } from "react";
import { DocumentRenderer } from "./DocumentRenderer.jsx";
import { collectClozes, getClozeContentWidth, getClozeMask, revealableIndices, splitGraphemes } from "../shared/cloze.js";

export function Preview({ card, settings, compact = false }) {
  const renderCloze = ({ id, text }) => (
    <PreviewClozeMask key={id} text={text} showExactWordLength={settings.display.showExactWordLength} />
  );

  return (
    <div className={compact ? "preview preview-compact" : "preview"}>
      {card.type === "basic" ? (
        <>
          <DocumentRenderer doc={card.front} scope={`${card.id}-front-preview`} />
          <div className="answer-pane"><DocumentRenderer doc={card.back} scope={`${card.id}-back-preview`} /></div>
        </>
      ) : <DocumentRenderer doc={card.content} scope={`${card.id}-preview`} renderCloze={renderCloze} />}
    </div>
  );
}

export function CardListPreview({ card, settings }) {
  return (
    <div className="card-preview">
      {card.type === "basic" ? (
        <>
          <div className="card-preview-line card-preview-primary"><InlineDocumentPreview doc={card.front} settings={settings} /></div>
          <div className="card-preview-line card-preview-secondary"><InlineDocumentPreview doc={card.back} settings={settings} /></div>
        </>
      ) : <div className="card-preview-line card-preview-primary"><InlineDocumentPreview doc={card.content} settings={settings} /></div>}
    </div>
  );
}

function InlineDocumentPreview({ doc, settings }) {
  const renderedClozeIds = new Set();
  const clozeText = new Map(collectClozes(doc).map((item) => [item.id, item.text]));

  function renderNode(node, path) {
    if (!node) return null;
    if (["spoilerBlock", "hidden", "hided"].includes(node.type)) {
      return <span className="card-hidden-fragment" key={path} aria-label="Hidden content">•••</span>;
    }
    if (node.type === "hardBreak") return <span key={path}> </span>;
    if (node.type === "text") return renderText(node, path);
    return (
      <span key={path}>
        {(node.content || []).map((child, index) => (
          <span key={`${path}-${index}`}>
            {renderNode(child, `${path}-${index}`)}
            {index < node.content.length - 1 && child.type !== "text" ? " " : null}
          </span>
        ))}
      </span>
    );
  }

  function renderText(node, path) {
    const marks = node.marks || [];
    if (marks.some((mark) => ["spoiler", "hidden", "hided"].includes(mark.type))) {
      return <span className="card-hidden-fragment" key={path} aria-label="Hidden content">•••</span>;
    }

    const clozeMark = marks.find((mark) => mark.type === "cloze");
    if (clozeMark) {
      const id = clozeMark.attrs?.id;
      if (renderedClozeIds.has(id)) return null;
      renderedClozeIds.add(id);
      const answer = clozeText.get(id) || node.text || "";
      const text = settings.display.showExactWordLength
        ? splitGraphemes(answer).map((char) => (/^[\p{L}\p{N}]$/u.test(char) ? "*" : char)).join("")
        : "***";
      return <span className="card-cloze-fragment" key={path}>{text}</span>;
    }

    let content = node.text || "";
    [...marks].reverse().forEach((mark) => {
      if (mark.type === "bold") content = <strong>{content}</strong>;
      else if (mark.type === "italic") content = <em>{content}</em>;
      else if (mark.type === "strike") content = <s>{content}</s>;
      else if (mark.type === "underline") content = <span className="mark-underline" style={{ textDecorationColor: mark.attrs?.color || "currentColor" }}>{content}</span>;
      else if (mark.type === "textStyle" && mark.attrs?.color) content = <span style={{ color: mark.attrs.color }}>{content}</span>;
    });
    return <span key={path}>{content}</span>;
  }

  return <>{renderNode(doc, "doc")}</>;
}

function PreviewClozeMask({ text, showExactWordLength }) {
  const [state, setState] = useState(() => createPreviewState(text));

  function revealPreviewHint(event) {
    event.preventDefault();
    event.stopPropagation();
    setState((current) => revealPreviewState(current));
  }

  return (
    <span
      className="cloze-preview"
      data-hints={state.hintsUsed}
      style={{ "--cloze-content-width": getClozeContentWidth(state, showExactWordLength) }}
    >
      <button type="button" className="cloze-mask" onClick={revealPreviewHint} aria-label={`Reveal a cloze hint; ${state.hintsUsed} used`}>
        {getClozeMask(state, showExactWordLength)}
      </button>
      <input aria-label="Cloze answer" />
      <span className="hint-counter">{state.hintsUsed}</span>
    </span>
  );
}

function createPreviewState(text) {
  const revealable = revealableIndices(text);
  return {
    text,
    chars: splitGraphemes(text),
    revealable,
    order: shuffle(revealable),
    revealed: [],
    hintsUsed: 0
  };
}

function revealPreviewState(state) {
  const revealedSet = new Set(state.revealed);
  const remaining = state.order.filter((index) => !revealedSet.has(index));
  const lettersPerHint = Math.max(1, Math.ceil(state.revealable.length / 4));
  const nextIndices = remaining.slice(0, lettersPerHint);
  if (!nextIndices.length) return state;
  return {
    ...state,
    revealed: [...state.revealed, ...nextIndices],
    hintsUsed: state.hintsUsed + 1
  };
}

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}
