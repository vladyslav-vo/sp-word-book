export function emptyDoc() {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [] }]
  };
}

export function textDoc(text) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : []
      }
    ]
  };
}

export function getDocText(doc) {
  const parts = [];

  function visit(node) {
    if (!node) return;
    if (node.type === "text") {
      parts.push(node.text || "");
      return;
    }
    if (Array.isArray(node.content)) node.content.forEach(visit);
  }

  visit(doc);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
