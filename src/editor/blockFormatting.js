const PRESENTATION_MARK_NAMES = ["bold", "italic", "strike", "underline", "textStyle"];

export function clearPresentationFormatting(editor) {
  const { state, view } = editor;
  const { from, to, empty } = state.selection;
  if (empty) return false;

  let transaction = state.tr;
  PRESENTATION_MARK_NAMES.forEach((name) => {
    const markType = state.schema.marks[name];
    if (markType) transaction = transaction.removeMark(from, to, markType);
  });

  if (!transaction.steps.length) return false;
  view.dispatch(transaction.scrollIntoView());
  view.focus();
  return true;
}
