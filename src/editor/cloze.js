import { Fragment, Slice } from "@tiptap/pm/model";
import { createId } from "../shared/id.js";

// Unicode-aware tokenization keeps numbers, diacritics, hyphens, and apostrophes grouped.
const WORD_PATTERN = /\p{N}+(?:[.,]\p{N}+)+|[\p{L}\p{N}]+(?:(?:[-'\u2019.])[\p{L}\p{N}]+)*/gu;

const APPLICATION_MARKS = new Set(["spoiler"]);

function selectionHasMark(editor, markName) {
  const { state } = editor;
  const markType = state.schema.marks[markName];

  if (!markType) return false;

  const { from, to, empty } = state.selection;

  if (empty) {
    return Boolean(markType.isInSet(state.storedMarks || state.selection.$from.marks()));
  }

  let found = false;
  state.doc.nodesBetween(from, to, (node) => {
    if (found || !node.isText) return;
    found = Boolean(markType.isInSet(node.marks));
  });

  return found;
}

export function toggleClozeSelection(editor) {
  if (selectionHasMark(editor, "cloze")) {
    editor.chain().focus().unsetMark("cloze").run();
    return { ok: true };
  }

  const { state, view } = editor;
  const { selection, schema } = state;

  if (selection.empty) {
    return { ok: false, error: "Select a word or phrase to create cloze deletions." };
  }

  const result = createClozeSlice(selection.content(), schema);

  if (!result.ok) {
    return { ok: false, error: "The selection does not contain any words for a cloze deletion." };
  }

  view.dispatch(state.tr.replaceSelection(result.slice));
  view.focus();

  return { ok: true };
}

export function createClozeSlice(slice, schema, idFactory = createId) {
  const groupId = idFactory("cloze-group");
  let wordCount = 0;

  function transformTextRun(nodes) {
    const combined = nodes.map((node) => node.text || "").join("");
    const tokens = [...combined.matchAll(WORD_PATTERN)].map((match) => {
      wordCount += 1;
      return {
        start: match.index ?? 0,
        end: (match.index ?? 0) + match[0].length,
        mark: schema.marks.cloze.create({ id: idFactory("cloze"), groupId })
      };
    });
    let nodeStart = 0;

    return nodes.flatMap((node) => {
      const text = node.text || "";
      const nodeEnd = nodeStart + text.length;
      const boundaries = new Set([nodeStart, nodeEnd]);
      tokens.forEach(({ start, end }) => {
        if (start > nodeStart && start < nodeEnd) boundaries.add(start);
        if (end > nodeStart && end < nodeEnd) boundaries.add(end);
      });
      const sorted = [...boundaries].sort((left, right) => left - right);
      const pieces = [];

      for (let index = 0; index < sorted.length - 1; index += 1) {
        const start = sorted[index];
        const end = sorted[index + 1];
        const value = text.slice(start - nodeStart, end - nodeStart);
        const token = tokens.find((item) => start >= item.start && end <= item.end);
        const marks = token
          ? [...node.marks.filter((mark) => APPLICATION_MARKS.has(mark.type.name)), token.mark]
          : node.marks;
        if (value) pieces.push(schema.text(value, marks));
      }

      nodeStart = nodeEnd;
      return pieces;
    });
  }

  function transformFragment(fragment) {
    const children = [];
    let textRun = [];

    function flushTextRun() {
      if (!textRun.length) return;
      children.push(...transformTextRun(textRun));
      textRun = [];
    }

    fragment.forEach((child) => {
      if (child.isText) {
        textRun.push(child);
        return;
      }

      flushTextRun();
      children.push(child.content?.size ? child.copy(transformFragment(child.content)) : child);
    });
    flushTextRun();
    return Fragment.fromArray(children);
  }

  const content = transformFragment(slice.content);
  return wordCount
    ? { ok: true, slice: new Slice(content, slice.openStart, slice.openEnd), wordCount }
    : { ok: false, slice, wordCount: 0 };
}
