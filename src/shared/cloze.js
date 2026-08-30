export function collectClozes(doc) {
  const items = [];

  function collectTextBlock(node) {
    let current = null;

    function flush() {
      if (current) items.push(current);
      current = null;
    }

    function visitInline(child) {
      if (child.type === "text") {
        const mark = (child.marks || []).find((item) => item.type === "cloze");
        if (!mark) {
          flush();
          return;
        }

        const id = mark.attrs?.id;
        if (current?.id === id) {
          current.text += child.text || "";
          current.fragments += 1;
        } else {
          flush();
          current = { id, text: child.text || "", fragments: 1 };
        }
        return;
      }

      if (Array.isArray(child.content) && child.content.length) child.content.forEach(visitInline);
      else flush();
    }

    (node.content || []).forEach(visitInline);
    flush();
  }

  function visit(node) {
    if (!node) return;
    if (node.type === "paragraph") {
      collectTextBlock(node);
      return;
    }
    (node.content || []).forEach(visit);
  }

  visit(doc);
  return items;
}

export function splitGraphemes(text) {
  if (Intl?.Segmenter) {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map((part) => part.segment);
  }
  return Array.from(text);
}

export function revealableIndices(text) {
  return splitGraphemes(text)
    .map((char, index) => (/^[\p{L}\p{N}]$/u.test(char) ? index : null))
    .filter((index) => index !== null);
}

export function getClozeMask(state, showExactWordLength) {
  if (showExactWordLength) {
    const revealed = new Set(state.revealed);
    return state.chars
      .map((char, index) => (/^[\p{L}\p{N}]$/u.test(char) ? (revealed.has(index) ? char : "*") : char))
      .join("");
  }
  if (!state.revealed.length) return "***";
  const revealedCharacters = [...state.revealed]
    .sort((left, right) => left - right)
    .map((index) => state.chars[index])
    .join(" ");
  return `*** · ${revealedCharacters}`;
}

export function getClozeContentWidth(state, showExactWordLength) {
  return showExactWordLength ? `${Math.max(3, state.chars.length) * 0.75 + 1.75}em` : "8em";
}
