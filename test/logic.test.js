import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createBlankCard, isCardMeaningful } from "../src/features/cards/cards.js";
import { cloneDefaultSettings } from "../src/data/defaultData.js";
import { normalizeHtmlFilename } from "../src/data/download.js";
import { createReviewSessionIds, getSuggestedRating } from "../src/features/review/scheduling.js";
import { createAttemptState, revealClozeHint } from "../src/features/review/clozeAttempt.js";
import { emptyDoc, textDoc } from "../src/editor/tiptapDocs.js";
import { validateCard, validatePersistentState, validateScheduling, validateSettings, validateTiptapDocument } from "../src/data/validation.js";
import { EDITOR_EXTENSIONS, EDITOR_SCHEMA } from "../src/editor/editorConfig.js";
import { createClozeSlice } from "../src/editor/cloze.js";
import { clearPresentationFormatting } from "../src/editor/blockFormatting.js";
import { migratePersistentState } from "../src/data/data.js";
import { buildActivityBuckets, recordReviewStatistics } from "../src/features/statistics/statistics.js";
import { collectClozes, getClozeContentWidth, getClozeMask } from "../src/shared/cloze.js";
import { getLocalDateKey } from "../src/shared/date.js";
import { createScheduling, formatReviewTiming } from "../src/shared/scheduling.js";
import { buildVisibleMonthSegments, getActivityLevel } from "../src/features/statistics/visualization.js";
import { EditorState, TextSelection } from "@tiptap/pm/state";

function basicCard(id = "basic-1") {
  return {
    id,
    type: "basic",
    front: textDoc("front"),
    back: textDoc("back"),
    scheduling: createScheduling()
  };
}

function clozeDoc(ids = ["cloze-1"]) {
  return {
    type: "doc",
    content: [{
      type: "paragraph",
      content: ids.map((id) => ({ type: "text", text: "word", marks: [{ type: "cloze", attrs: { id } }] }))
    }]
  };
}

test("blank new cards are not meaningful", () => {
  assert.equal(isCardMeaningful(createBlankCard("basic")), false);
  assert.equal(isCardMeaningful(createBlankCard("cloze")), false);
  assert.equal(isCardMeaningful({ ...createBlankCard("basic"), front: textDoc("typed") }), true);
});

test("card validation enforces user-facing content rules", () => {
  const missingBack = { ...basicCard(), back: emptyDoc() };
  assert.deepEqual(validateCard(missingBack), {
    ok: false,
    kind: "user",
    message: "A two-sided card must have a back side."
  });

  const withoutMark = { id: "cloze-1", type: "cloze", content: textDoc("text"), scheduling: createScheduling() };
  assert.equal(validateCard(withoutMark).kind, "user");

  const missingId = { id: "cloze-1", type: "cloze", content: clozeDoc([null]), scheduling: createScheduling() };
  assert.equal(validateCard(missingId).message, "A cloze deletion must have a non-empty id.");
});

test("duplicate cloze ids are rejected because review keys collide", () => {
  const content = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "beautiful", marks: [{ type: "cloze", attrs: { id: "same" } }] }] },
      { type: "paragraph", content: [{ type: "text", text: "mountain", marks: [{ type: "cloze", attrs: { id: "same" } }] }] }
    ]
  };
  const card = { id: "cloze-1", type: "cloze", content, scheduling: createScheduling() };
  assert.equal(validateCard(card).message, "A cloze card contains duplicate cloze ids.");
});

test("adjacent text fragments with one cloze id form one logical answer", () => {
  const content = clozeDoc(["same", "same"]);
  content.content[0].content[0].text = "be";
  content.content[0].content[1].text = "autiful";
  const card = { id: "cloze-1", type: "cloze", content, scheduling: createScheduling() };

  assert.deepEqual(collectClozes(content), [{ id: "same", text: "beautiful", fragments: 2 }]);
  assert.equal(validateCard(card).ok, true);
  assert.equal(createAttemptState(collectClozes(content)).same.text, "beautiful");
});

test("different adjacent cloze ids remain separate logical answers", () => {
  const content = clozeDoc(["first", "second"]);
  assert.deepEqual(collectClozes(content).map(({ id }) => id), ["first", "second"]);
  assert.equal(validateCard({ id: "cloze-1", type: "cloze", content, scheduling: createScheduling() }).ok, true);
});

test("cloze ranges inside spoiler blocks validate and remain independent semantic state", () => {
  const content = {
    type: "doc",
    content: [{
      type: "spoilerBlock",
      content: [{
        type: "paragraph",
        content: [
          { type: "text", text: "one", marks: [{ type: "cloze", attrs: { id: "one" } }] },
          { type: "text", text: " and " },
          { type: "text", text: "two", marks: [{ type: "cloze", attrs: { id: "two" } }] }
        ]
      }]
    }]
  };
  const card = { id: "cloze-1", type: "cloze", content, scheduling: createScheduling() };

  assert.equal(validateCard(card).ok, true);
  assert.deepEqual(collectClozes(content).map(({ id, text }) => ({ id, text })), [
    { id: "one", text: "one" },
    { id: "two", text: "two" }
  ]);
});

test("cloze creation spans text-node boundaries, strips presentation marks, and keeps spoiler semantics", () => {
  const doc = EDITOR_SCHEMA.nodeFromJSON({
    type: "doc",
    content: [{
      type: "paragraph",
      content: [
        { type: "text", text: "he", marks: [{ type: "bold" }, { type: "spoiler" }] },
        { type: "text", text: "llo", marks: [{ type: "italic" }, { type: "spoiler" }] },
        { type: "text", text: " мир", marks: [{ type: "textStyle", attrs: { color: "#ff0000" } }] }
      ]
    }]
  });
  let sequence = 0;
  const result = createClozeSlice(doc.slice(1, doc.content.size - 1), EDITOR_SCHEMA, (prefix) => `${prefix}-${++sequence}`);
  const json = result.slice.content.toJSON();
  const textNodes = json.flatMap((node) => node.type === "text" ? [node] : node.content || []);
  const helloNodes = textNodes.filter((node) => ["he", "llo", "hello"].includes(node.text));
  const helloIds = helloNodes.map((node) => node.marks.find((mark) => mark.type === "cloze")?.attrs.id);

  assert.equal(result.wordCount, 2);
  assert.equal(new Set(helloIds).size, 1);
  assert.ok(helloNodes.every((node) => node.marks.some((mark) => mark.type === "spoiler")));
  assert.ok(textNodes.filter((node) => node.marks?.some((mark) => mark.type === "cloze")).every((node) =>
    node.marks.every((mark) => ["cloze", "spoiler"].includes(mark.type))
  ));
});

test("cloze schema rejects presentation marks without removing cloze semantics", () => {
  const cloze = EDITOR_SCHEMA.marks.cloze.create({ id: "answer" });
  for (const name of ["bold", "italic", "strike", "underline", "textStyle"]) {
    const presentation = EDITOR_SCHEMA.marks[name].create();
    assert.deepEqual(cloze.addToSet([presentation]).map((mark) => mark.type.name), ["cloze"]);
    assert.deepEqual(presentation.addToSet([cloze]).map((mark) => mark.type.name), ["cloze"]);
  }
});

test("presentation formatting over a mixed selection applies only to ordinary text", () => {
  const doc = EDITOR_SCHEMA.nodeFromJSON({
    type: "doc",
    content: [{ type: "paragraph", content: [
      { type: "text", text: "answer", marks: [{ type: "cloze", attrs: { id: "answer" } }] },
      { type: "text", text: " plain" }
    ] }]
  });
  const state = EditorState.create({ doc });
  const next = state.apply(state.tr.addMark(1, doc.content.size - 1, EDITOR_SCHEMA.marks.bold.create()));
  assert.deepEqual(next.doc.firstChild.firstChild.marks.map((mark) => mark.type.name), ["cloze"]);
  assert.deepEqual(next.doc.firstChild.lastChild.marks.map((mark) => mark.type.name), ["bold"]);
});

test("clear formatting removes presentation marks but preserves cloze and spoiler", () => {
  const doc = EDITOR_SCHEMA.nodeFromJSON({
    type: "doc",
    content: [{ type: "paragraph", content: [
      {
        type: "text", text: "answer",
        marks: [{ type: "cloze", attrs: { id: "answer" } }, { type: "spoiler" }]
      },
      { type: "text", text: " bold", marks: [{ type: "bold" }, { type: "italic" }] }
    ] }]
  });
  const state = EditorState.create({ doc, selection: TextSelection.create(doc, 1, doc.content.size - 1) });
  let nextState = state;
  const editor = { state, view: { dispatch: (transaction) => { nextState = state.apply(transaction); }, focus() {} } };

  clearPresentationFormatting(editor);
  assert.deepEqual(nextState.doc.firstChild.firstChild.marks.map((mark) => mark.type.name).sort(), ["cloze", "spoiler"]);
  assert.deepEqual(nextState.doc.firstChild.lastChild.marks, []);
});

test("persistent validation rejects duplicate card ids", () => {
  const state = { schemaVersion: 4, settings: cloneDefaultSettings(), cards: [basicCard(), basicCard()], statistics: { daily: [] } };
  assert.match(validatePersistentState(state).message, /duplicate card id/);
});

test("the embedded collection loads against the current editor schema", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const match = html.match(/<script id="app-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match);
  assert.equal(validatePersistentState(JSON.parse(match[1])).ok, true);
});

test("schema 3 migrates without changing cards, settings, or scheduling", () => {
  const oldState = { schemaVersion: 3, settings: cloneDefaultSettings(), cards: [basicCard()] };
  const migrated = migratePersistentState(oldState);
  assert.equal(migrated.schemaVersion, 4);
  assert.deepEqual(migrated.settings, oldState.settings);
  assert.deepEqual(migrated.cards, oldState.cards);
  assert.deepEqual(migrated.statistics, { daily: [] });
  assert.equal(validatePersistentState(migrated).ok, true);
});

test("statistics count the first answer as new and later answers as reviews", () => {
  const date = new Date(2026, 7, 27, 23, 30);
  let statistics = recordReviewStatistics({ daily: [] }, { isNew: true, rating: "veryHard", date });
  statistics = recordReviewStatistics(statistics, { isNew: false, rating: "easy", date });
  assert.deepEqual(statistics.daily[0], {
    date: "2026-08-27",
    newCards: 1,
    reviews: 1,
    ratings: { veryHard: 1, hard: 0, medium: 0, easy: 1, veryEasy: 0 }
  });
});

test("statistics use local calendar dates and create a new entry after midnight", () => {
  assert.equal(getLocalDateKey(new Date(2026, 7, 27, 23, 59)), "2026-08-27");
  let statistics = recordReviewStatistics({ daily: [] }, { isNew: true, rating: "medium", date: new Date(2026, 7, 27, 23, 59) });
  statistics = recordReviewStatistics(statistics, { isNew: false, rating: "hard", date: new Date(2026, 7, 28, 0, 1) });
  assert.deepEqual(statistics.daily.map((entry) => entry.date), ["2026-08-27", "2026-08-28"]);
});

test("daily and aggregate periods include empty buckets", () => {
  const daily = [{
    date: "2026-08-25", newCards: 2, reviews: 3,
    ratings: { veryHard: 0, hard: 0, medium: 5, easy: 0, veryEasy: 0 }
  }];
  const now = new Date(2026, 7, 27, 12);
  const sevenDays = buildActivityBuckets(daily, "7D", now);
  assert.equal(sevenDays.length, 7);
  assert.deepEqual(sevenDays.at(-1), {
    key: "2026-08-27", label: "27 Aug", detailLabel: "27 Aug 2026",
    startDate: "2026-08-27", endDate: "2026-08-27", newCards: 0, reviews: 0
  });
  assert.equal(sevenDays.find((bucket) => bucket.key === "2026-08-25").reviews, 3);
  assert.equal(buildActivityBuckets(daily, "30D", now).length, 30);
  assert.equal(buildActivityBuckets(daily, "3M", now).length, 13);
  assert.equal(buildActivityBuckets(daily, "6M", now).length, 26);
  assert.equal(buildActivityBuckets(daily, "1Y", now).length, 12);
});

test("activity intensity is adaptive, stable for equal totals, and safe for empty periods", () => {
  assert.equal(getActivityLevel(0, 0), 0);
  assert.equal(getActivityLevel(0, 20), 0);
  assert.equal(getActivityLevel(5, 20), 1);
  assert.equal(getActivityLevel(10, 20), getActivityLevel(10, 20));
  assert.equal(getActivityLevel(20, 20), 4);
});

test("weekly buckets expose their actual rolling range across month and year boundaries", () => {
  const monthBoundary = buildActivityBuckets([], "3M", new Date(2026, 6, 5, 12)).at(-1);
  assert.equal(monthBoundary.startDate, "2026-06-29");
  assert.equal(monthBoundary.endDate, "2026-07-05");
  assert.equal(monthBoundary.detailLabel, "29 Jun \u2013 5 Jul 2026");

  const yearBoundary = buildActivityBuckets([], "3M", new Date(2026, 0, 4, 12)).at(-1);
  assert.equal(yearBoundary.detailLabel, "29 Dec 2025 \u2013 4 Jan 2026");
});

test("visible month segments include partial edge months in chronological positions", () => {
  const buckets = buildActivityBuckets([], "3M", new Date(2026, 7, 27, 12));
  const segments = buildVisibleMonthSegments(buckets[0].startDate, buckets.at(-1).endDate);
  assert.deepEqual(segments.map((segment) => segment.key), ["2026-05", "2026-06", "2026-07", "2026-08"]);
  assert.equal(segments[0].visibleStart, buckets[0].startDate);
  assert.equal(segments.at(-1).visibleEnd, buckets.at(-1).endDate);
  assert.equal(segments[0].startRatio, 0);
  assert.equal(segments.at(-1).endRatio, 1);
  assert.ok(segments.every((segment, index) => index === 0 || segment.startRatio === segments[index - 1].endRatio));
});

test("a real month separator falls inside a week that crosses the boundary", () => {
  const buckets = buildActivityBuckets([], "3M", new Date(2026, 6, 5, 12));
  const crossingIndex = buckets.findIndex((bucket) => bucket.startDate === "2026-06-29" && bucket.endDate === "2026-07-05");
  const july = buildVisibleMonthSegments(buckets[0].startDate, buckets.at(-1).endDate).find((segment) => segment.key === "2026-07");
  assert.ok(crossingIndex >= 0);
  assert.ok(july.startRatio > crossingIndex / buckets.length);
  assert.ok(july.startRatio < (crossingIndex + 1) / buckets.length);
  assert.equal(buckets[crossingIndex].detailLabel, "29 Jun \u2013 5 Jul 2026");
});

test("visible month segmentation remains unambiguous across a year boundary", () => {
  const segments = buildVisibleMonthSegments("2026-12-15", "2027-01-20");
  assert.deepEqual(segments.map(({ key, label }) => ({ key, label })), [
    { key: "2026-12", label: "Dec" },
    { key: "2027-01", label: "Jan" }
  ]);
  assert.equal(segments[0].visibleStart, "2026-12-15");
  assert.equal(segments[1].visibleEnd, "2027-01-20");
});

test("statistics validation rejects bad dates, counters, ratings, and duplicate days", () => {
  const entry = { date: "2026-02-29", newCards: 0, reviews: 0, ratings: { veryHard: 0, hard: 0, medium: 0, easy: 0, veryEasy: 0 } };
  const state = { schemaVersion: 4, settings: cloneDefaultSettings(), cards: [], statistics: { daily: [entry] } };
  assert.match(validatePersistentState(state).message, /valid YYYY-MM-DD/);
  state.statistics.daily = [{ ...entry, date: "2026-02-28", reviews: -1 }];
  assert.match(validatePersistentState(state).message, /non-negative integer/);
  state.statistics.daily = [{ ...entry, date: "2026-02-28", ratings: { ...entry.ratings, easy: 0.5 } }];
  assert.match(validatePersistentState(state).message, /non-negative integer/);
  state.statistics.daily = [{ ...entry, date: "2026-02-28" }, { ...entry, date: "2026-02-28" }];
  assert.match(validatePersistentState(state).message, /duplicate date/);
});

test("settings and scheduling validators reject dangerous numeric values", () => {
  const settings = cloneDefaultSettings();
  settings.scheduling.reviewMultipliers.easy = Number.NaN;
  assert.equal(validateSettings(settings).ok, false);
  assert.equal(validateScheduling({ ...createScheduling(), reviewCount: -1 }).ok, false);
});

test("review multipliers use the same minimum as the settings UI", () => {
  const settings = cloneDefaultSettings();
  settings.scheduling.reviewMultipliers.easy = 0.9;
  assert.match(validateSettings(settings).message, /at least 1/);
  settings.scheduling.reviewMultipliers.easy = 1;
  assert.equal(validateSettings(settings).ok, true);
});

test("Tiptap validation uses the editor schema for nodes, marks, and structure", () => {
  assert.equal(validateTiptapDocument(textDoc("valid")).ok, true);
  assert.equal(validateTiptapDocument({ type: "doc", content: [{ type: "mysteryNode" }] }).ok, false);
  assert.equal(validateTiptapDocument({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "mysteryMark" }] }] }]
  }).ok, false);
  assert.equal(validateTiptapDocument({ type: "doc", content: [{ type: "text", text: "not allowed at doc level" }] }).ok, false);
});

test("editor schema contains only supported content and has unique extension names", () => {
  for (const unsupported of ["heading", "bulletList", "orderedList", "listItem", "codeBlock", "horizontalRule"]) {
    assert.equal(EDITOR_SCHEMA.nodes[unsupported], undefined);
  }
  assert.equal(EDITOR_SCHEMA.marks.code, undefined);
  assert.equal(EDITOR_EXTENSIONS.filter((extension) => extension.name === "underline").length, 1);
  assert.ok(EDITOR_SCHEMA.marks.underline);
});

test("exact-length display controls both mask and field width in Review", () => {
  const state = createAttemptState([{ id: "word", text: "beautiful" }]).word;
  assert.equal(getClozeMask(state, true), "*********");
  assert.equal(getClozeMask(state, false), "***");
  assert.notEqual(getClozeContentWidth(state, true), getClozeContentWidth(state, false));

  const shorter = createAttemptState([{ id: "word", text: "cat" }]).word;
  assert.equal(getClozeContentWidth(state, false), getClozeContentWidth(shorter, false));
  assert.equal(getClozeMask({ ...state, revealed: [2] }, false).startsWith("*** · "), true);
});

test("hints cannot mutate a correctly answered cloze or its recommendation inputs", () => {
  const initial = createAttemptState([{ id: "word", text: "answer" }]);
  const correct = { ...initial, word: { ...initial.word, correct: true, value: "answer" } };
  const recommendation = getSuggestedRating(correct);
  const afterHint = revealClozeHint(correct, "word");
  assert.equal(afterHint, correct);
  assert.equal(correct.word.hintsUsed, 0);
  assert.equal(getSuggestedRating(afterHint), recommendation);
});

test("type-specific blank drafts preserve identity and scheduling", () => {
  const source = basicCard("preserved-id");
  const converted = createBlankCard("cloze", source);
  assert.equal(converted.id, source.id);
  assert.deepEqual(converted.scheduling, source.scheduling);
  assert.equal("front" in converted, false);
  assert.equal("back" in converted, false);
});

test("HTML filenames are normalized", () => {
  assert.equal(normalizeHtmlFilename("collection"), "collection.html");
  assert.equal(normalizeHtmlFilename("collection.html"), "collection.html");
  assert.equal(normalizeHtmlFilename("collection.htm"), "collection.html");
  assert.throws(() => normalizeHtmlFilename("   "), /file name/);
});

test("forced review starts with the selected future card and does not duplicate due cards", () => {
  const now = Date.parse("2026-08-27T12:00:00.000Z");
  const due = {
    ...basicCard("due"),
    scheduling: createScheduling({ dueAt: "2026-08-27T11:00:00.000Z" })
  };
  const future = {
    ...basicCard("future"),
    scheduling: createScheduling({ dueAt: "2026-08-29T12:00:00.000Z" })
  };
  const later = {
    ...basicCard("later"),
    scheduling: createScheduling({ dueAt: "2026-08-30T12:00:00.000Z" })
  };

  assert.deepEqual(createReviewSessionIds([due, future, later], "future", now), ["future", "due"]);
  assert.deepEqual(createReviewSessionIds([due, future, later], "due", now), ["due"]);
});

test("compact review timing handles never-reviewed and scheduled cards", () => {
  const now = Date.parse("2026-08-27T12:00:00.000Z");
  assert.deepEqual(formatReviewTiming(createScheduling(), now), {
    lastReview: "Never",
    nextReview: "Available now"
  });

  const timing = formatReviewTiming(createScheduling({
    lastReviewedAt: "2026-08-25T12:00:00.000Z",
    dueAt: "2026-08-27T17:00:00.000Z"
  }), now);
  assert.match(timing.lastReview, /2 days ago/);
  assert.match(timing.nextReview, /in 5 hr/);
});
