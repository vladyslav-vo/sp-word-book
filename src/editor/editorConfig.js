import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { getSchema } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import { Cloze, ColoredUnderline, FontSize, Spoiler, SpoilerBlock } from "./extensions.js";

const starterKit = StarterKit.configure({
  bulletList: false,
  code: false,
  codeBlock: false,
  heading: false,
  horizontalRule: false,
  listItem: false,
  listKeymap: false,
  orderedList: false,
  underline: false
});

export const EDITOR_EXTENSIONS = [starterKit, TextStyle, Color, FontSize, ColoredUnderline, SpoilerBlock, Spoiler, Cloze];
export const EDITOR_SCHEMA = getSchema(EDITOR_EXTENSIONS);
