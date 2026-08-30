export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function areJsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
