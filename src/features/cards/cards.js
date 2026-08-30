import { emptyDoc, getDocText } from "../../editor/tiptapDocs.js";
import { createId } from "../../shared/id.js";
import { createScheduling } from "../../shared/scheduling.js";

export function createBlankCard(type, common = {}) {
  const base = {
    ...common,
    id: common.id || createId("card"),
    type,
    scheduling: createScheduling(common.scheduling || {})
  };
  delete base.front;
  delete base.back;
  delete base.content;
  return type === "basic" ? { ...base, front: emptyDoc(), back: emptyDoc() } : { ...base, content: emptyDoc() };
}

export function isCardMeaningful(card) {
  if (!card) return false;
  if (card.type === "basic") return Boolean(getDocText(card.front) || getDocText(card.back));
  if (card.type === "cloze") return Boolean(getDocText(card.content));
  return false;
}
