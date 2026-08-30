export function createScheduling(partial = {}) {
  return {
    phase: partial.phase === "review" ? "review" : "new",
    intervalMinutes: Number.isFinite(partial.intervalMinutes) ? partial.intervalMinutes : null,
    dueAt: typeof partial.dueAt === "string" ? partial.dueAt : null,
    lastReviewedAt: typeof partial.lastReviewedAt === "string" ? partial.lastReviewedAt : null,
    reviewCount: Number.isFinite(partial.reviewCount) ? partial.reviewCount : 0,
    lapseCount: Number.isFinite(partial.lapseCount) ? partial.lapseCount : 0,
    lastSuggestedRating: typeof partial.lastSuggestedRating === "string" ? partial.lastSuggestedRating : null,
    lastSelectedRating: typeof partial.lastSelectedRating === "string" ? partial.lastSelectedRating : null
  };
}

export function formatInterval(minutes) {
  if (minutes % 43200 === 0 && minutes >= 43200) return formatUnit(minutes / 43200, "month");
  if (minutes % 10080 === 0 && minutes >= 10080) return formatUnit(minutes / 10080, "week");
  if (minutes % 1440 === 0 && minutes >= 1440) return formatUnit(minutes / 1440, "day");
  if (minutes % 60 === 0 && minutes >= 60) return formatUnit(minutes / 60, "hour");
  return formatUnit(minutes, "minute");
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

export function formatReviewTiming(scheduling, now = Date.now()) {
  const clean = createScheduling(scheduling || {});
  return {
    lastReview: clean.lastReviewedAt ? formatRelativeDate(clean.lastReviewedAt, now) : "Never",
    nextReview: clean.dueAt ? formatRelativeDate(clean.dueAt, now) : "Available now"
  };
}

function formatUnit(value, unit) {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

function formatRelativeDate(value, now) {
  const deltaMs = new Date(value).getTime() - now;
  const absoluteMs = Math.abs(deltaMs);
  const units = absoluteMs < 60 * 60 * 1000
    ? ["minute", 60 * 1000]
    : absoluteMs < 24 * 60 * 60 * 1000
      ? ["hour", 60 * 60 * 1000]
      : absoluteMs < 30 * 24 * 60 * 60 * 1000
        ? ["day", 24 * 60 * 60 * 1000]
        : absoluteMs < 365 * 24 * 60 * 60 * 1000
          ? ["month", 30 * 24 * 60 * 60 * 1000]
          : ["year", 365 * 24 * 60 * 60 * 1000];
  const amount = Math.round(deltaMs / units[1]);
  return new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" }).format(amount, units[0]);
}
