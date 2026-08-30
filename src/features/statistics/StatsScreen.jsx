import { useMemo, useState } from "react";
import { buildActivityBuckets } from "./statistics.js";
import { StatsVisualization } from "./StatsVisualization.jsx";

const PERIODS = ["7D", "30D", "3M", "6M", "1Y"];

export function StatsScreen({ statistics }) {
  const [period, setPeriod] = useState("7D");
  const buckets = useMemo(() => buildActivityBuckets(statistics.daily, period), [statistics.daily, period]);
  const totals = buckets.reduce((sum, bucket) => ({
    newCards: sum.newCards + bucket.newCards,
    reviews: sum.reviews + bucket.reviews
  }), { newCards: 0, reviews: 0 });

  return (
    <section className="stats-screen">
      <div className="stats-heading">
        <div><p className="eyebrow">Learning history</p><h2>Stats</h2></div>
        <div className="period-selector" role="group" aria-label="Statistics period">
          {PERIODS.map((item) => (
            <button className={period === item ? "active" : ""} type="button" key={item} aria-pressed={period === item} onClick={() => setPeriod(item)}>{item}</button>
          ))}
        </div>
      </div>

      <div className="stats-panel">
        <div className="stats-panel-heading"><h3>Study activity</h3></div>
        <StatsVisualization key={period} period={period} data={buckets} />
      </div>

      <div className="stats-totals" aria-label={`Totals for ${period}`}>
        <div><span>New cards</span><strong>{totals.newCards}</strong></div>
        <div><span>Repeat reviews</span><strong>{totals.reviews}</strong></div>
        <div><span>Total views</span><strong>{totals.newCards + totals.reviews}</strong></div>
      </div>
    </section>
  );
}
