import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

// Font size lives on TextStyle so it can be combined with color in one Tiptap mark.
export const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => {
              const raw = element.style.fontSize || element.getAttribute("data-font-size");
              if (!raw) return null;
              const value = Number.parseInt(String(raw).replace("px", ""), 10);
              return Number.isFinite(value) ? value : null;
            },
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return {
                "data-font-size": attributes.fontSize,
                style: `font-size: ${attributes.fontSize}px;`
              };
            }
          }
        }
      }
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ commands }) =>
          commands.setMark("textStyle", { fontSize }),
      unsetFontSize:
        () =>
        ({ commands }) =>
          commands.setMark("textStyle", { fontSize: null })
    };
  }
});

// A custom underline mark stores line color independently from text color.
export const ColoredUnderline = Mark.create({
  name: "underline",

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-underline-color") || null,
        renderHTML: (attributes) => {
          const color = attributes.color || "currentColor";
          return {
            "data-underline-color": attributes.color,
            style: `text-decoration-line: underline; text-decoration-style: solid; text-decoration-color: ${color};`
          };
        }
      }
    };
  },

  parseHTML() {
    return [{ tag: "span[data-underline-color]" }, { tag: "u" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "mark-underline" }), 0];
  },

  addCommands() {
    return {
      setUnderlineColor:
        (color = null) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      unsetColoredUnderline:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name)
    };
  }
});


// The block node keeps multiple paragraphs inside one spoiler when Enter is pressed.
export const SpoilerBlock = Node.create({
  name: "spoilerBlock",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: "div[data-spoiler-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-spoiler-block": "true", class: "spoiler-block" }), 0];
  },

  addCommands() {
    return {
      toggleSpoilerBlock:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
      closeSpoilerBlock:
        () =>
        ({ state, dispatch }) => {
          const { $from } = state.selection;
          let spoilerDepth = null;

          for (let depth = $from.depth; depth > 0; depth -= 1) {
            if ($from.node(depth).type.name === this.name) {
              spoilerDepth = depth;
              break;
            }
          }

          if (spoilerDepth === null) return false;

          const afterSpoiler = $from.after(spoilerDepth);
          let transaction = state.tr;

          if (afterSpoiler >= state.doc.content.size) {
            transaction = transaction.insert(afterSpoiler, state.schema.nodes.paragraph.create());
          }

          const nextPosition = Math.min(afterSpoiler + 1, transaction.doc.content.size);
          transaction = transaction.setSelection(TextSelection.near(transaction.doc.resolve(nextPosition), 1));

          if (dispatch) dispatch(transaction.scrollIntoView());
          return true;
        }
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (!this.editor.isActive(this.name)) return false;
        return this.editor.commands.splitBlock();
      }
    };
  }
});
// Inline spoilers remain available for short fragments inside a paragraph.
export const Spoiler = Mark.create({
  name: "spoiler",

  parseHTML() {
    return [{ tag: "span[data-spoiler]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-spoiler": "true", class: "mark-spoiler" }), 0];
  }
});

// Application semantics may coexist, but presentation marks never belong to a cloze answer.
export const Cloze = Mark.create({
  name: "cloze",
  excludes: "bold italic strike underline textStyle",

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-cloze-id"),
        renderHTML: (attributes) => ({ "data-cloze-id": attributes.id })
      },
      groupId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-cloze-group"),
        renderHTML: (attributes) => ({ "data-cloze-group": attributes.groupId })
      }
    };
  },

  parseHTML() {
    return [{ tag: "span[data-cloze-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "mark-cloze" }), 0];
  }
});
