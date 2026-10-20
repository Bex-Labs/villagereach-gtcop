export default function LevelPill({ level, name }) {
  if (!level) return <span className="level-pill level-none">Not assessed</span>;
  return (
    <span className={`level-pill level-${level}`}>
      Level {level} · {name}
    </span>
  );
}