export default function WeeklySummary({ hours }) {
  const display = Number.isFinite(hours) ? hours.toFixed(1) : "0.0";

  return (
    <div
      className="flex items-center justify-between rounded-[var(--radius)] border px-4 py-3"
      style={{ borderColor: "var(--border)", background: "var(--accent)" }}
    >
      <div>
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--muted-foreground)" }}
        >
          Hours This Week
        </p>
        <p className="font-heading text-2xl font-bold">{display}</p>
      </div>
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        Mon – Sun
      </p>
    </div>
  );
}
