/** Фон всего приложения: туманность, свечение, зерно, редкие звёзды. */
export function Nebula() {
  return (
    <div className="nebula" aria-hidden>
      <div className="nebula-glow a" />
      <div className="nebula-glow b" />
      <div className="nebula-glow c" />
      <div className="nebula-stars" />
      <div className="nebula-grain" />
    </div>
  );
}
