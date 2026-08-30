function pad(value) {
  return String(value).padStart(2, "0");
}

export function getLocalDateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) throw new Error("A valid date is required.");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function parseLocalDateKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return getLocalDateKey(date) === key ? date : null;
}

export function addCalendarDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12);
}

export function calendarDayDistance(start, end) {
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12);
  let distance = 0;

  while (cursor < end) {
    cursor = addCalendarDays(cursor, 1);
    distance += 1;
  }
  while (cursor > end) {
    cursor = addCalendarDays(cursor, -1);
    distance -= 1;
  }

  return distance;
}
