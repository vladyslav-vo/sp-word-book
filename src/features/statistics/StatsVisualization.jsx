import { useState } from "react";
import { ActivityChart } from "./ActivityChart.jsx";
import { ActivityGrid } from "./ActivityGrid.jsx";
import { WeeklyActivityChart } from "./WeeklyActivityChart.jsx";

const CONTEXT_LABELS = {
  "7D": "Each bar = day",
  "30D": "Each tile = day",
  "3M": "Each bar = 7-day interval",
  "6M": "Each bar = 7-day interval",
  "1Y": "Each bar = calendar month"
};

function BucketDetails({ bucket }) {
  const total = bucket.newCards + bucket.reviews;
  return (
    <div className="bucket-details" aria-live="polite">
      <strong>{bucket.detailLabel}</strong>
      <dl>
        <div><dt>Total views</dt><dd>{total}</dd></div>
        <div><dt>New cards</dt><dd>{bucket.newCards}</dd></div>
        <div><dt>Repeat reviews</dt><dd>{bucket.reviews}</dd></div>
      </dl>
    </div>
  );
}

export function StatsVisualization({ period, data }) {
  const [selectedKey, setSelectedKey] = useState(data.at(-1)?.key || null);
  const selected = data.find((bucket) => bucket.key === selectedKey) || data.at(-1);
  const useBars = period === "7D" || period === "1Y";
  const useWeeklyBars = period === "3M" || period === "6M";

  return (
    <div className="stats-visualization">
      <p className="visualization-context">{CONTEXT_LABELS[period]}</p>
      {useBars
        ? <ActivityChart data={data} selectedKey={selected?.key} onSelect={(bucket) => setSelectedKey(bucket.key)} />
        : useWeeklyBars
          ? <WeeklyActivityChart data={data} selectedKey={selected?.key} onSelect={(bucket) => setSelectedKey(bucket.key)} />
          : <ActivityGrid data={data} variant="daily" selectedKey={selected?.key} onSelect={(bucket) => setSelectedKey(bucket.key)} />}
      {selected ? <BucketDetails bucket={selected} /> : null}
    </div>
  );
}
