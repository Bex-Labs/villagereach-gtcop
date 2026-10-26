// Thin white line icons on a coloured circle (VillageReach icon style).
// Decorative only: screen readers skip them (aria-hidden).
const ICONS = {
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.7 2.6 4 5.6 4 9s-1.3 6.4-4 9c-2.7-2.6-4-5.6-4-9s1.3-6.4 4-9z" />
    </>
  ),
  document: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M10 12h5M10 16h5" />
    </>
  ),
  layers: (
    <>
      <path d="M12 4l9 5-9 5-9-5z" />
      <path d="M3 14l9 5 9-5" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M4 10h16M4 15h16M10 4v16" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-5M12 16V8M16 16v-3" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" />
      <path d="M9 4a3 3 0 0 1 6 0M9 13l2 2 4-4" />
    </>
  ),
};

export default function IconDisc({ name, color = "rust", size = "md" }) {
  return (
    <span className={`icon-disc icon-disc-${color} icon-disc-${size}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="square">
        {ICONS[name]}
      </svg>
    </span>
  );
}