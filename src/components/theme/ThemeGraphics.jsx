function isNeon(theme) {
  return theme === "neon" || theme === "dark";
}

export function ThemeSignature({ theme }) {
  const neon = isNeon(theme);
  return (
    <p className={`theme-signature theme-signature-${neon ? "neon" : "morning"}`}>
      {neon ? <NeonSignIcon /> : <LeafIcon />}
      <span>{neon ? "Neon Streets" : "Morning Mojito"}</span>
    </p>
  );
}

export function PageThemeGraphic({ theme }) {
  return isNeon(theme) ? null : <MorningSprigGraphic className="page-theme-art" />;
}

export function ReviewThemeGraphic({ theme, variant = "card" }) {
  return isNeon(theme) ? null : <MorningSprigGraphic className={`review-theme-art review-theme-art-${variant}`} />;
}

export function SettingsThemeGraphic({ theme }) {
  return isNeon(theme) ? null : <MorningBubblesGraphic className="settings-theme-art" />;
}

export function EmptyThemeGraphic({ theme }) {
  return isNeon(theme)
    ? <NeonLinesGraphic className="empty-theme-art" />
    : <MorningBubblesGraphic className="empty-theme-art" />;
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 18c6-1 10-5 12-12M6 16C2 13 3 8 9 7c1 4 0 7-3 9Zm7-5c0-5 3-8 8-8 0 6-3 9-8 8Z" />
    </svg>
  );
}

function NeonSignIcon() {
  return (
    <svg viewBox="0 0 26 24" aria-hidden="true">
      <path d="M3 21V9l4-4v16M10 21V3l5 5v13M18 21V7l5-3v17M1 21h24" />
      <path className="graphic-accent" d="M4 12h3m4-4h4m4 4h4" />
    </svg>
  );
}

function MorningSprigGraphic({ className }) {
  return (
    <svg className={`theme-graphic theme-graphic-morning ${className}`} viewBox="0 0 360 260" aria-hidden="true">
      <circle className="graphic-lime" cx="86" cy="188" r="49" />
      <circle className="graphic-lime-inner" cx="86" cy="188" r="36" />
      <path className="graphic-stem" d="M89 204c45-60 92-103 162-136" />
      <path className="graphic-leaf" d="M137 150c-4-38 22-61 56-61 0 36-19 60-56 61Z" />
      <path className="graphic-leaf graphic-leaf-light" d="M177 118c2-33 25-50 53-46-5 29-23 48-53 46Z" />
      <path className="graphic-leaf" d="M198 100c-9-29 6-53 34-61 6 29-5 51-34 61Z" />
      <path className="graphic-leaf graphic-leaf-light" d="M117 170c-30 0-49-17-51-44 29-3 50 13 51 44Z" />
      <path className="graphic-vein" d="M139 147l44-47m-3 16 4-17m-19 34 23-4m12-31 22-42m-16 31 23-12m-106 82-41-24" />
      <g className="graphic-bubbles"><circle cx="280" cy="53" r="7"/><circle cx="303" cy="91" r="3"/><circle cx="273" cy="129" r="11"/><circle cx="315" cy="154" r="5"/></g>
    </svg>
  );
}

function MorningBubblesGraphic({ className }) {
  return (
    <svg className={`theme-graphic theme-graphic-morning ${className}`} viewBox="0 0 220 100" aria-hidden="true">
      <path className="graphic-stem" d="M15 87c52-8 91-33 123-75" />
      <path className="graphic-leaf" d="M65 66c-27 2-42-11-45-32 24-4 42 7 45 32Zm34-20c-4-25 10-39 31-42 4 22-8 39-31 42Z" />
      <g className="graphic-bubbles"><circle cx="161" cy="24" r="10"/><circle cx="197" cy="51" r="5"/><circle cx="166" cy="77" r="3"/></g>
    </svg>
  );
}

function NeonLinesGraphic({ className }) {
  return (
    <svg className={`theme-graphic theme-graphic-neon ${className}`} viewBox="0 0 220 100" aria-hidden="true">
      <path className="neon-horizon" d="M4 82h212" />
      <path className="neon-building" d="M18 80V31h38v49m12 0V13h47v67m13 0V38h31v42m12 0V24h31v56" />
      <path className="neon-sign" d="M76 25h29v20H76Zm102 9h17v29h-17Z" />
      <path className="neon-road" d="m7 97 77-15m129 15-78-15m-34 15 7-15" />
    </svg>
  );
}
