export function parseDurationToMinutes(value) {
  const input = value.trim().toLowerCase();
  if (!input) return { ok: false, error: "Enter a duration such as 1d or 1d 12h." };

  const unitMinutes = {
    s: 1 / 60,
    m: 1,
    h: 60,
    d: 1440,
    w: 10080,
    mo: 43200
  };
  const pattern = /(\d+(?:[.,]\d+)?)\s*(mo|[smhdw])/g;
  let total = 0;
  let matched = "";
  let match;

  while ((match = pattern.exec(input)) !== null) {
    const amount = Number(match[1].replace(",", "."));
    const unit = match[2];
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "The duration must be a positive number." };
    total += amount * unitMinutes[unit];
    matched += match[0];
  }

  if (!matched || input.replace(/\s+/g, "") !== matched.replace(/\s+/g, "")) {
    return { ok: false, error: "Use 60s, 1m, 2h, 3d, 1w, 1mo, or a combination such as 1d 12h." };
  }

  return { ok: true, minutes: Math.max(1, Math.round(total)) };
}

export function formatDurationInput(minutes) {
  if (minutes % 43200 === 0 && minutes >= 43200) return `${minutes / 43200}mo`;
  if (minutes % 10080 === 0 && minutes >= 10080) return `${minutes / 10080}w`;
  if (minutes % 1440 === 0 && minutes >= 1440) return `${minutes / 1440}d`;
  if (minutes % 60 === 0 && minutes >= 60) return `${minutes / 60}h`;
  return `${minutes}m`;
}
