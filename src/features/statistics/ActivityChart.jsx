const WIDTH = 360;
const HEIGHT = 190;
const LEFT = 24;
const RIGHT = 4;
const TOP = 8;
const BOTTOM = 34;

export function ActivityChart({ data, selectedKey, onSelect }) {
  const maxTotal = Math.max(0, ...data.map((bucket) => bucket.newCards + bucket.reviews));
  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const slotWidth = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.max(4, Math.min(slotWidth * 0.58, 28));

  return (
    <svg className="activity-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label="Total study views bar chart">
      {[0, 0.5, 1].map((ratio) => {
        const y = TOP + plotHeight * (1 - ratio);
        return (
          <g key={ratio}>
            <line className="chart-grid-line" x1={LEFT} x2={WIDTH - RIGHT} y1={y} y2={y} />
            <text className="chart-axis-label" x={LEFT - 6} y={y + 4} textAnchor="end">{Math.round(maxTotal * ratio)}</text>
          </g>
        );
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
            <rect className="chart-bar-total" x={x} y={y} width={barWidth} height={height} rx="3" />
            {/* The full time slot remains tappable when a visible month bar is narrow. */}
            <rect className="chart-hit-area" x={LEFT + slotWidth * index} y={TOP} width={slotWidth} height={plotHeight + BOTTOM} />
            <text className="chart-axis-label chart-x-label" x={center} y={HEIGHT - 13} textAnchor="middle">{bucket.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
