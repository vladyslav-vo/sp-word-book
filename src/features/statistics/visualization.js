import { addCalendarDays, calendarDayDistance, getLocalDateKey, parseLocalDateKey } from "../../shared/date.js";

export function buildVisibleMonthSegments(startKey, endKey) {
  const visibleStart = parseLocalDateKey(startKey);
  const visibleEnd = parseLocalDateKey(endKey);
  if (!visibleStart || !visibleEnd || visibleStart > visibleEnd) throw new Error("A valid visible date range is required.");

  const rangeEndExclusive = addCalendarDays(visibleEnd, 1);
  const totalDays = calendarDayDistance(visibleStart, rangeEndExclusive);
  const segments = [];
  let monthStart = new Date(visibleStart.getFullYear(), visibleStart.getMonth(), 1, 12);

  while (monthStart <= visibleEnd) {
    const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1, 12);
    const monthEnd = addCalendarDays(nextMonth, -1);
    const segmentStart = monthStart < visibleStart ? visibleStart : monthStart;
    const segmentEnd = monthEnd > visibleEnd ? visibleEnd : monthEnd;
    const startOffset = calendarDayDistance(visibleStart, segmentStart);
    const endOffset = calendarDayDistance(visibleStart, addCalendarDays(segmentEnd, 1));
    segments.push({
      key: getLocalDateKey(monthStart).slice(0, 7),
      label: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(monthStart),
      visibleStart: getLocalDateKey(segmentStart),
      visibleEnd: getLocalDateKey(segmentEnd),
      startRatio: startOffset / totalDays,
      endRatio: endOffset / totalDays
    });
    monthStart = nextMonth;
  }

  return segments;
}

export function getActivityLevel(total, maximum) {
  if (total <= 0 || maximum <= 0) return 0;
  // Four linear bands preserve equality and adapt to the selected period without brittle absolute thresholds.
  return Math.min(4, Math.max(1, Math.ceil((total / maximum) * 4)));
}
