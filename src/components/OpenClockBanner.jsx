import { formatTimeDisplay } from "../lib/timeUtils.js";
import StatusBadge from "./StatusBadge.jsx";

export default function OpenClockBanner({
  entry,
  endTime,
  onEndTimeChange,
  onClose,
  onDismiss,
  closing = false,
  error,
}) {
  return (
    <div
      className="rounded-[var(--radius)] border p-4"
      style={{
        borderColor: "#bfdbfe",
        background: "#eff6ff",
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-heading text-sm font-bold text-blue-800">
            You have an open time entry
          </p>
          <p className="mt-1 text-sm text-blue-700">
            Close it before starting a new one to avoid overlapping hours.
          </p>
        </div>
        <StatusBadge status="open" />
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt
            className="text-xs uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Job
          </dt>
          <dd className="font-medium">{entry.jobName}</dd>
        </div>
        <div>
          <dt
            className="text-xs uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Date
          </dt>
          <dd className="font-medium">{entry.date}</dd>
        </div>
        <div>
          <dt
            className="text-xs uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Started
          </dt>
          <dd className="font-medium">
            {formatTimeDisplay(entry.startTime)}
          </dd>
        </div>
      </dl>

      <div className="mb-3">
        <label
          className="mb-1 block text-xs font-medium uppercase tracking-wide text-blue-800"
        >
          End Time <span style={{ color: "var(--destructive)" }}>*</span>
        </label>
        <input
          type="time"
          value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
          className="w-full rounded-[var(--radius)] border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "#fff" }}
        />
      </div>

      {error && (
        <p className="mb-3 text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={closing}
          className="flex-1 rounded-[var(--radius)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          {closing ? "Closing…" : "Close Entry"}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={closing}
          className="rounded-[var(--radius)] border px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
        >
          View Form
        </button>
      </div>
    </div>
  );
}
