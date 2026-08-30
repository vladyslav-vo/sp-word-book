import { RATING_ORDER } from "../../data/defaultData.js";
import { addCalendarDays, getLocalDateKey } from "../../shared/date.js";

function sumEntries(daily, start, end) {
  const startKey = getLocalDateKey(start);
  const endKey = getLocalDateKey(end);
  return daily.reduce((total, entry) => {
    if (entry.date < startKey || entry.date > endKey) return total;
    return {
      newCards: total.newCards + entry.newCards,
      reviews: total.reviews + entry.reviews
    };
  }, { newCards: 0, reviews: 0 });
}

function shortDate(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
}

function fullDate(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function weeklyRange(start, end, includeYear) {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.getDate()}\u2013${end.getDate()} ${new Intl.DateTimeFormat("en-GB", { month: "short" }).format(end)}${includeYear ? ` ${end.getFullYear()}` : ""}`;
  }
  if (sameYear) {
    return `${shortDate(start)} \u2013 ${shortDate(end)}${includeYear ? ` ${end.getFullYear()}` : ""}`;
  }
  return `${fullDate(start)} \u2013 ${fullDate(end)}`;
}

function dailyBucket(daily, date) {
  const key = getLocalDateKey(date);
  const entry = daily.find((item) => item.date === key);
  return {
    key,
    label: shortDate(date),
    detailLabel: fullDate(date),
    startDate: key,
    endDate: key,
    newCards: entry?.newCards || 0,
    reviews: entry?.reviews || 0
  };
}

function buildDailyBuckets(daily, count, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return Array.from({ length: count }, (_, index) => dailyBucket(daily, addCalendarDays(end, index - count + 1)));
}

function buildWeeklyBuckets(daily, count, now = new Date()) {
  const finalEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return Array.from({ length: count }, (_, index) => {
    const end = addCalendarDays(finalEnd, -7 * (count - index - 1));
    const start = addCalendarDays(end, -6);
    const totals = sumEntries(daily, start, end);
    return {
      key: `${getLocalDateKey(start)}:${getLocalDateKey(end)}`,
      label: weeklyRange(start, end, false),
      detailLabel: weeklyRange(start, end, true),
      startDate: getLocalDateKey(start),
      endDate: getLocalDateKey(end),
      ...totals
    };
  });
}

function buildMonthlyBuckets(daily, count, now = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - count + index + 1, 1, 12);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12);
    const totals = sumEntries(daily, month, end);
    const detailLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(month);
    return {
      key: getLocalDateKey(month).slice(0, 7),
      label: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(month),
      detailLabel,
      startDate: getLocalDateKey(month),
      endDate: getLocalDateKey(end),
      ...totals
    };
  });
}

export function buildActivityBuckets(daily, period, now = new Date()) {
  if (period === "7D") return buildDailyBuckets(daily, 7, now);
  if (period === "30D") return buildDailyBuckets(daily, 30, now);
  if (period === "3M") return buildWeeklyBuckets(daily, 13, now);
  if (period === "6M") return buildWeeklyBuckets(daily, 26, now);
  if (period === "1Y") return buildMonthlyBuckets(daily, 12, now);
  throw new Error(`Unknown statistics period "${period}".`);
}

export function recordReviewStatistics(statistics, { isNew, rating, date = new Date() }) {
  if (!RATING_ORDER.includes(rating)) throw new Error(`Unknown review rating "${rating}".`);
  const key = getLocalDateKey(date);
  const daily = statistics?.daily || [];
  const existing = daily.find((entry) => entry.date === key);
  const entry = existing || {
    date: key,
    newCards: 0,
    reviews: 0,
    ratings: Object.fromEntries(RATING_ORDER.map((item) => [item, 0]))
  };
  const updated = {
    ...entry,
    newCards: entry.newCards + (isNew ? 1 : 0),
    reviews: entry.reviews + (isNew ? 0 : 1),
    ratings: { ...entry.ratings, [rating]: entry.ratings[rating] + 1 }
  };
  const nextDaily = existing
    ? daily.map((item) => (item.date === key ? updated : item))
    : [...daily, updated];
  return { daily: nextDaily.sort((left, right) => left.date.localeCompare(right.date)) };
}
