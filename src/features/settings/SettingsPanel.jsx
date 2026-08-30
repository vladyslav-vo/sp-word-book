import { useEffect, useState } from "react";
import { MoonStar, RotateCcw, SunMedium } from "lucide-react";
import { RATING_LABELS, cloneDefaultSettings } from "../../data/defaultData.js";
import { formatDurationInput, parseDurationToMinutes } from "./duration.js";
import { formatInterval } from "../../shared/scheduling.js";
import { SettingsThemeGraphic } from "../../components/theme/ThemeGraphics.jsx";
export function SettingsPanel({ settings, onChange }) {
  function update(path, value) {
    onChange((current) => {
      const next = JSON.parse(JSON.stringify(current));
      let target = next;
      path.slice(0, -1).forEach((key) => { target = target[key]; });
      target[path[path.length - 1]] = value;
      return next;
    });
  }

  const theme = settings.display.theme === "dark" ? "neon" : settings.display.theme === "light" ? "morning" : settings.display.theme;

  return (
    <section className="settings-panel">
      <header className="section-heading settings-heading">
        <div><p className="eyebrow">Tune your deck</p><h2>Settings</h2></div>
        <SettingsThemeGraphic theme={theme} />
      </header>

      <section className="settings-section settings-display">
        <div className="settings-section-heading"><span>01</span><div><h3>Display</h3><p>Choose a visual atmosphere and how hidden words appear.</p></div></div>
        <fieldset className="theme-picker">
          <legend>Theme</legend>
          <label className={`theme-choice morning-swatch${theme === "morning" ? " selected" : ""}`}>
            <input type="radio" name="theme" value="morning" checked={theme === "morning"} onChange={(event) => update(["display", "theme"], event.target.value)} />
            <SunMedium aria-hidden="true" size={22} />
            <span><strong>Morning Mojito</strong><small>White, fresh mint, daylight</small></span>
            <span className="selection-mark" aria-hidden="true" />
          </label>
          <label className={`theme-choice neon-swatch${theme === "neon" ? " selected" : ""}`}>
            <input type="radio" name="theme" value="neon" checked={theme === "neon"} onChange={(event) => update(["display", "theme"], event.target.value)} />
            <MoonStar aria-hidden="true" size={22} />
            <span><strong>Neon Streets</strong><small>Night ink, cyan outlines</small></span>
            <span className="selection-mark" aria-hidden="true" />
          </label>
        </fieldset>
        <label className="inline-check switch-row">
          <input type="checkbox" checked={settings.display.showExactWordLength} onChange={(event) => update(["display", "showExactWordLength"], event.target.checked)} />
          <span><strong>Show exact word length</strong><small>Use one asterisk for every hidden character.</small></span>
        </label>
      </section>

      <div className="settings-grid">
        <section className="settings-section">
          <div className="settings-section-heading"><span>02</span><div><h3>New-card intervals</h3><p>Initial spacing after each rating.</p></div></div>
          <div className="settings-fields">{Object.entries(settings.scheduling.learningIntervalsMinutes).map(([key, value]) => <DurationSetting key={key} label={RATING_LABELS[key]} value={value} onChange={(next) => update(["scheduling", "learningIntervalsMinutes", key], next)} />)}</div>
        </section>
        <section className="settings-section">
          <div className="settings-section-heading"><span>03</span><div><h3>Review multipliers</h3><p>How strongly each rating changes the interval.</p></div></div>
          <div className="settings-fields">{Object.entries(settings.scheduling.reviewMultipliers).map(([key, value]) => <NumberSetting key={key} label={RATING_LABELS[key]} value={value} min="1" step="0.1" onChange={(next) => update(["scheduling", "reviewMultipliers", key], next)} />)}</div>
        </section>
      </div>
      <button className="secondary-button restore-button" type="button" onClick={() => onChange(cloneDefaultSettings())}><RotateCcw aria-hidden="true" size={17} />Restore default settings</button>
    </section>
  );
}
function DurationSetting({ label, value, onChange }) {
  const [draft, setDraft] = useState(() => formatDurationInput(value));
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(formatDurationInput(value));
  }, [value]);

  function applyDuration() {
    const result = parseDurationToMinutes(draft);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError("");
    onChange(result.minutes);
    setDraft(formatDurationInput(result.minutes));
  }

  return (
    <label className="duration-setting">
      <span>{label}</span>
      <div className="duration-row">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={applyDuration} placeholder="1d 12h" />
        <button type="button" onClick={applyDuration}>OK</button>
      </div>
      <small>{formatInterval(value)}</small>
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
function NumberSetting({ label, value, min, step, onChange }) {
  return <label className="number-setting"><span>{label}</span><input type="number" min={min} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

