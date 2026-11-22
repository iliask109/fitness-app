export default function Ring({ value, goal, label, color }: { value: number; goal: number; label: string; color: string }) {
  const r = 34, c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  return (
    <div className="ring">
      <svg viewBox="0 0 80 80" width="88" height="88">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--track)" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dashoffset .5s' }} />
        <text x="40" y="44" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text)">{value}</text>
      </svg>
      <span className="small">{label}</span>
      <span className="muted small">מתוך {goal}</span>
    </div>
  );
}
