import { useState } from "react";
import { collectClozes } from "../shared/cloze.js";

export function DocumentRenderer({ doc, scope, renderCloze }) {
  const [openSpoilers, setOpenSpoilers] = useState({});
  const renderedClozeIds = new Set();
  const clozeText = new Map(collectClozes(doc).map((item) => [item.id, item.text]));

  function toggleSpoiler(key) {
    setOpenSpoilers((current) => ({ ...current, [key]: !current[key] }));
  }

  function renderNode(node, path) {
    if (!node) return null;
    if (node.type === "doc") return <>{(node.content || []).map((child, index) => renderNode(child, `${path}-${index}`))}</>;
    if (node.type === "paragraph") return <p key={path}>{(node.content || []).map((child, index) => renderNode(child, `${path}-${index}`))}</p>;
    if (node.type === "blockquote") return <blockquote key={path}>{(node.content || []).map((child, index) => renderNode(child, `${path}-${index}`))}</blockquote>;
    if (node.type === "spoilerBlock") {
      const key = `${scope}-${path}-block`;
      const open = openSpoilers[key];
      return (
        <section key={path} className={open ? "spoiler-block-preview open" : "spoiler-block-preview"}>
          <button type="button" onClick={() => toggleSpoiler(key)}>{open ? "Hide spoiler" : "Show spoiler"}</button>
          {open ? <div className="spoiler-block-content">{(node.content || []).map((child, index) => renderNode(child, `${path}-${index}`))}</div> : null}
        </section>
      );
    }
    if (node.type === "hardBreak") return <br key={path} />;
    if (node.type === "text") return renderMarkedText(node, path);
    return <span key={path}>{(node.content || []).map((child, index) => renderNode(child, `${path}-${index}`))}</span>;
  }

  function renderMarkedText(node, path) {
    const marks = node.marks || [];
    const clozeMark = marks.find((mark) => mark.type === "cloze");
    const clozeId = clozeMark?.attrs?.id;
    const firstClozeFragment = clozeId && !renderedClozeIds.has(clozeId);
    let element = node.text || "";

    if (renderCloze && clozeId) {
      renderedClozeIds.add(clozeId);
      element = firstClozeFragment
        ? renderCloze({ id: clozeId, text: clozeText.get(clozeId) || node.text || "" })
        : null;
    }

    [...marks].reverse().forEach((mark, index) => {
      if (mark.type === "cloze") return;
      if (mark.type === "spoiler") {
        const key = `${scope}-${path}-${index}`;
        const open = openSpoilers[key];
        element = renderCloze && clozeId
          ? (
            <span className={open ? "spoiler-preview open" : "spoiler-preview"}>
              <button type="button" onClick={() => toggleSpoiler(key)}>{open ? "Hide spoiler" : "Show spoiler"}</button>
              {open ? element : null}
            </span>
          )
          : <button type="button" className={open ? "spoiler-preview open" : "spoiler-preview"} onClick={() => toggleSpoiler(key)}>{open ? element : "spoiler"}</button>;
        return;
      }
      if (mark.type === "bold") element = <strong>{element}</strong>;
      else if (mark.type === "italic") element = <em>{element}</em>;
      else if (mark.type === "strike") element = <s>{element}</s>;
      else if (mark.type === "textStyle") element = <span style={{ color: mark.attrs?.color || undefined, fontSize: mark.attrs?.fontSize ? `${mark.attrs.fontSize}px` : undefined }}>{element}</span>;
      else if (mark.type === "underline") element = <span className="mark-underline" style={{ textDecorationColor: mark.attrs?.color || "currentColor" }}>{element}</span>;
    });

    return <span key={path}>{element}</span>;
  }

  return <div className="doc-preview">{renderNode(doc, "doc")}</div>;
}
