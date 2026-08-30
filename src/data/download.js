export function downloadHtml(html, filename) {
  const blob = new Blob([html], {
    type: "text/html;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export function getDefaultHtmlFilename() {
  const pathPart = decodeURIComponent(window.location.pathname.split("/").pop() || "");
  if (!pathPart || /^index\.html?$/i.test(pathPart)) return "vocabulary-cards.html";
  return normalizeHtmlFilename(pathPart);
}

export function normalizeHtmlFilename(value) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Enter a file name.");
  return /\.html?$/i.test(trimmed) ? trimmed.replace(/\.htm$/i, ".html") : `${trimmed}.html`;
}
