import { useMemo, useState } from "react";

export default function JobPicker({ jobs, value, onChange, disabled = false }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.displayLabel?.toLowerCase().includes(q) ||
        j.name?.toLowerCase().includes(q) ||
        j.street?.toLowerCase().includes(q) ||
        j.city?.toLowerCase().includes(q)
    );
  }, [jobs, query]);

  const selected = jobs.find((j) => j.id === value?.id) ?? value;

  return (
    <div className="relative">
      <label
        className="mb-1 block text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--muted-foreground)" }}
      >
        Job <span style={{ color: "var(--destructive)" }}>*</span>
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-[var(--radius)] border px-3 py-2.5 text-left text-sm disabled:opacity-50"
        style={{ borderColor: "var(--border)", background: "var(--background)" }}
      >
        <span className={selected ? "" : "text-[var(--muted-foreground)]"}>
          {selected?.displayLabel ?? "Select a job…"}
        </span>
        <svg
          className="h-4 w-4 shrink-0 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-20 mt-1 w-full rounded-[var(--radius)] border shadow-lg"
          style={{
            borderColor: "var(--border)",
            background: "var(--background)",
          }}
        >
          <div className="border-b p-2" style={{ borderColor: "var(--border)" }}>
            <input
              type="search"
              placeholder="Search jobs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-[var(--radius)] border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
              autoFocus
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li
                className="px-3 py-2 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                No jobs found
              </li>
            )}
            {filtered.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"
                  style={
                    value?.id === job.id
                      ? { background: "var(--accent)" }
                      : undefined
                  }
                  onClick={() => {
                    onChange(job);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {job.displayLabel}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
