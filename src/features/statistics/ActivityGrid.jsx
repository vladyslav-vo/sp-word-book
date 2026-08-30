import { getActivityLevel } from "./visualization.js";

export function ActivityGrid({ data, variant, selectedKey, onSelect }) {
  const maximum = Math.max(0, ...data.map((bucket) => bucket.newCards + bucket.reviews));
  const isDaily = variant === "daily";

  return (
    <div>
      <div className={`activity-grid activity-grid-${variant}`} role="group" aria-label={isDaily ? "Daily activity grid" : "Weekly activity grid"}>
        {data.map((bucket) => {
          const total = bucket.newCards + bucket.reviews;
          const level = getActivityLevel(total, maximum);
          return (
            <button
              className={`activity-tile activity-level-${level}${bucket.key === selectedKey ? " selected" : ""}`}
              type="button"
              key={bucket.key}
              aria-label={`${bucket.detailLabel}: Total views ${total}, New cards ${bucket.newCards}, Repeat reviews ${bucket.reviews}`}
              aria-pressed={bucket.key === selectedKey}
              onClick={() => onSelect(bucket)}
            >
              {isDaily ? <span className="visually-hidden">{bucket.label}</span> : <span>{bucket.label}</span>}
            </button>
          );
        })}
      </div>
      <div className="intensity-key" aria-label="Activity intensity from less to more">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => <i className={`activity-level-${level}`} key={level} />)}
        <span>More</span>
      </div>
    </div>
  );
}
