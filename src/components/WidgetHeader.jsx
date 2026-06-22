export default function WidgetHeader({ title = "Time Entry", subtitle }) {
  return (
    <header
      className="rounded-t-[var(--radius)] px-4 py-3"
      style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}
    >
      <h1 className="font-heading text-lg font-bold leading-tight">{title}</h1>
      {subtitle && (
        <p className="mt-0.5 text-sm opacity-80">{subtitle}</p>
      )}
    </header>
  );
}
