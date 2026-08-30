import { buildVisibleMonthSegments } from "./visualization.js";

const WIDTH = 360;
const HEIGHT = 196;
const LEFT = 24;
const RIGHT = 4;
const TOP = 28;
const BOTTOM = 12;

export function WeeklyActivityChart({ data, selectedKey, onSelect }) {
  const maxTotal = Math.max(0, ...data.map((bucket) => bucket.newCards + bucket.reviews));
  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const slotWidth = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.max(2.5, slotWidth * 0.58);
  const months = data.length ? buildVisibleMonthSegments(data[0].startDate, data.at(-1).endDate) : [];

  return (
    <svg className="activity-chart weekly-activity-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label="Weekly total study views grouped by calendar month">
      {months.map((month, index) => (
        index % 2 === 1
          ? <rect className="chart-month-band" key={`band-${month.key}`} x={LEFT + month.startRatio * plotWidth} y={TOP} width={(month.endRatio - month.startRatio) * plotWidth} height={plotHeight} />
          : null
      ))}
      {[0, 0.5, 1].map((ratio) => {
        const y = TOP + plotHeight * (1 - ratio);
        return (
          <g key={ratio}>
            <line className="chart-grid-line" x1={LEFT} x2={WIDTH - RIGHT} y1={y} y2={y} />
            <text className="chart-axis-label" x={LEFT - 6} y={y + 4} textAnchor="end">{Math.round(maxTotal * ratio)}</text>
          </g>
        );
      })}
      {months.slice(1).map((month) => {
        // Calendar-day positioning lets a real month boundary pass through a weekly slot without splitting its bar.
        const x = LEFT + month.startRatio * plotWidth;
        return <line className="chart-month-separator" key={`separator-${month.key}`} x1={x} x2={x} y1={TOP - 4} y2={TOP + plotHeight} />;
      })}
      {data.map((bucket, index) => {
        const total = bucket.newCards + bucket.reviews;
        const height = maxTotal > 0 ? total * plotHeight / maxTotal : 0;
        const center = LEFT + slotWidth * (index + 0.5);
        const x = center - barWidth / 2;
        const y = TOP + plotHeight - height;
        return (
          <g
            className={bucket.key === selectedKey ? "chart-bucket selected" : "chart-bucket"}
            key={bucket.key}
            role="button"
            tabIndex={0}
            aria-label={`${bucket.detailLabel}: Total views ${total}, New cards ${bucket.newCards}, Repeat reviews ${bucket.reviews}`}
            onClick={() => onSelect(bucket)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(bucket);
              }
            }}
          >
            {bucket.key === selectedKey ? <rect className="chart-selection" x={LEFT + slotWidth * index + 1} y={TOP} width={Math.max(slotWidth - 2, 1)} height={plotHeight} rx="3" /> : null}
            <rect className="chart-bar-total" x={x} y={y} width={barWidth} height={height} rx="2" />
            {/* Each complete week slot is the touch target, independent of the narrow visible bar. */}
            <rect className="chart-hit-area" x={LEFT + slotWidth * index} y={TOP} width={slotWidth} height={plotHeight + BOTTOM} />
          </g>
        );
      })}
      {months.map((month) => {
        // Partial edge months are labelled at the center of their visible intersection, not their full calendar span.
        const x = LEFT + ((month.startRatio + month.endRatio) / 2) * plotWidth;
        return <text className="chart-month-label" key={`label-${month.key}`} x={x} y="14" textAnchor="middle">{month.label}</text>;
      })}
    </svg>
  );
}
