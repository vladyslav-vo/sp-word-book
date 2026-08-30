import neonReviewBackground from "../../assets/neon-review-background.jpg";

export function NeonThemeBackground({ theme }) {
  const neon = theme === "neon" || theme === "dark";
  if (!neon) return null;

  return (
    <div className="neon-theme-background-layer" aria-hidden="true">
      <img src={neonReviewBackground} alt="" />
    </div>
  );
}
