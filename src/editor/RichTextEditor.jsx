import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { toggleClozeSelection } from "./cloze.js";
import { clearPresentationFormatting } from "./blockFormatting.js";
import { EDITOR_EXTENSIONS } from "./editorConfig.js";
export function RichTextEditor({ content, allowCloze, onChange, onError }) {
  const [fontSize, setFontSize] = useState(18);
  const [textColor, setTextColor] = useState("#1d252c");
  const [underlineColor, setUnderlineColor] = useState("#e53935");
  const editor = useEditor({ extensions: EDITOR_EXTENSIONS, content, editorProps: { attributes: { class: "tiptap-editor" }, transformPastedHTML(html) { return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+="[^"]*"/gi, ""); } }, onUpdate({ editor: updatedEditor }) { onChange(updatedEditor.getJSON()); } });
  if (!editor) return <p className="empty-state">Loading editor...</p>;
  return <div className="rich-editor"><Toolbar editor={editor} allowCloze={allowCloze} onError={onError} fontSize={fontSize} setFontSize={setFontSize} textColor={textColor} setTextColor={setTextColor} underlineColor={underlineColor} setUnderlineColor={setUnderlineColor} /><EditorContent editor={editor} /></div>;
}

function Toolbar({ editor, allowCloze, onError, fontSize, setFontSize, textColor, setTextColor, underlineColor, setUnderlineColor }) {
  const [isSpoilerActive, setIsSpoilerActive] = useState(() => editor.isActive("spoilerBlock"));

  useEffect(() => {
    function syncToolbarState() {
      setIsSpoilerActive(editor.isActive("spoilerBlock"));
    }

    editor.on("selectionUpdate", syncToolbarState);
    editor.on("transaction", syncToolbarState);
    syncToolbarState();

    return () => {
      editor.off("selectionUpdate", syncToolbarState);
      editor.off("transaction", syncToolbarState);
    };
  }, [editor]);

  function toggleSpoiler() {
    const { empty } = editor.state.selection;

    if (editor.isActive("spoilerBlock")) {
      editor.chain().focus().closeSpoilerBlock().run();
    } else if (!empty) {
      editor.chain().focus().toggleSpoilerBlock().run();
    } else {
      editor.chain().focus().toggleSpoilerBlock().run();
    }

    setIsSpoilerActive(editor.isActive("spoilerBlock"));
    onError("");
  }

  function toggleCloze() {
    const result = toggleClozeSelection(editor);
    if (!result.ok) return onError(result.error);
    onError("");
  }

  function hasTextSelection() {
    return !editor.state.selection.empty;
  }

  function applyFontSize(value) {
    setFontSize(value);

    if (!hasTextSelection()) {
      onError("Select text before changing its size.");
      return;
    }

    editor.chain().focus().setFontSize(value).run();
    onError("");
  }

  function applyTextColor(value) {
    setTextColor(value);

    if (!hasTextSelection()) {
      onError("Select text before changing its color.");
      return;
    }

    editor.chain().focus().setColor(value).run();
    onError("");
  }

  function applyUnderlineColor(value) {
    setUnderlineColor(value);

    if (!hasTextSelection()) {
      onError("Select text before applying an underline.");
      return;
    }

    editor.chain().focus().setUnderlineColor(value).run();
    onError("");
  }

  function clearFormatting() {
    if (!hasTextSelection()) {
      onError("Select text before clearing its presentation formatting.");
      return;
    }

    clearPresentationFormatting(editor);
    onError("");
  }

  const inlineButtons = [
    { label: "↶", title: "Undo", onClick: () => editor.chain().focus().undo().run() },
    { label: "↷", title: "Redo", onClick: () => editor.chain().focus().redo().run() },
    { label: <strong>B</strong>, title: "Bold", active: editor.isActive("bold"), onClick: () => editor.chain().focus().toggleBold().run() },
    { label: <em>I</em>, title: "Italic", active: editor.isActive("italic"), onClick: () => editor.chain().focus().toggleItalic().run() },
    { label: <span className="toolbar-icon underline-action">U</span>, title: "Colored underline", active: editor.isActive("underline"), onClick: () => applyUnderlineColor(underlineColor) },
    { label: <s>S</s>, title: "Strikethrough", active: editor.isActive("strike"), onClick: () => editor.chain().focus().toggleStrike().run() },
    { label: "❝", title: "Block quote", active: editor.isActive("blockquote"), onClick: () => editor.chain().focus().toggleBlockquote().run() }
  ];

  return (
    <div className="toolbar" aria-label="Formatting toolbar">
      {inlineButtons.map((button) => (
        <ToolbarButton key={button.title} {...button} />
      ))}
      <ToolbarButton
        title={isSpoilerActive ? "Close spoiler" : "Spoiler"}
        active={isSpoilerActive}
        onClick={toggleSpoiler}
        label={<span className="toolbar-icon spoiler-eye" aria-hidden="true" />}
      />
      {allowCloze ? <ToolbarButton title="Create cloze deletion" active={editor.isActive("cloze")} onClick={toggleCloze} label="[*]" /> : null}
      <label className="range-control" title="Text size" aria-label="Text size">
        <span>T{fontSize}</span>
        <input type="range" min="5" max="50" step="1" value={fontSize} onChange={(event) => applyFontSize(Number(event.target.value))} />
      </label>
      <label className="icon-color-control text-color-control" style={{ "--picker-color": textColor }} title="Text color" aria-label="Text color">
        <span className="color-icon text-color-icon" aria-hidden="true" />
        <input type="color" value={textColor} onChange={(event) => applyTextColor(event.target.value)} />
      </label>
      <label className="icon-color-control underline-color-control" style={{ "--picker-color": underlineColor }} title="Underline color" aria-label="Underline color">
        <span className="color-icon underline-color-icon" aria-hidden="true" />
        <input type="color" value={underlineColor} onChange={(event) => applyUnderlineColor(event.target.value)} />
      </label>
      <ToolbarButton title="Clear formatting" onClick={clearFormatting} label="⌫" />
    </div>
  );
}

function ToolbarButton({ title, label, active = false, onClick }) {
  return (
    <button type="button" title={title} aria-label={title} className={active ? "active" : ""} onClick={onClick}>
      {label}
    </button>
  );
}
