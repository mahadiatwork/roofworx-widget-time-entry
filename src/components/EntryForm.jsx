import { useState } from "react";
import zohoSchema from "../config/zohoSchema.js";
import {
  calculateTotalHours,
  todayLocal,
  validateEntry,
} from "../lib/timeUtils.js";
import JobPicker from "./JobPicker.jsx";

export default function EntryForm({
  jobs,
  initialJob,
  onSearchJobs,
  onSubmit,
  submitting = false,
  disabled = false,
}) {
  const [job, setJob] = useState(initialJob ?? null);
  const [date, setDate] = useState(todayLocal());
  const [startTime, setStartTime] = useState(zohoSchema.defaultStartTime);
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(null);

  const totalHours = calculateTotalHours(startTime, endTime);

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validateEntry({ job, date, startTime, endTime });
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    await onSubmit({
      job,
      date,
      startTime,
      endTime,
      totalHours: String(totalHours),
      notes,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <JobPicker
        jobs={jobs}
        value={job}
        onChange={setJob}
        onSearch={onSearchJobs}
        disabled={disabled || submitting}
      />

      <div>
        <label
          className="mb-1 block text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--muted-foreground)" }}
        >
          Date <span style={{ color: "var(--destructive)" }}>*</span>
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={disabled || submitting}
          className="w-full rounded-[var(--radius)] border px-3 py-2.5 text-sm disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="mb-1 block text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Start Time <span style={{ color: "var(--destructive)" }}>*</span>
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={disabled || submitting}
            className="w-full rounded-[var(--radius)] border px-3 py-2.5 text-sm disabled:opacity-50"
            style={{ borderColor: "var(--border)" }}
            required
          />
        </div>
        <div>
          <label
            className="mb-1 block text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            End Time <span style={{ color: "var(--destructive)" }}>*</span>
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={disabled || submitting}
            className="w-full rounded-[var(--radius)] border px-3 py-2.5 text-sm disabled:opacity-50"
            style={{ borderColor: "var(--border)" }}
            required
          />
        </div>
      </div>

      {totalHours !== null && totalHours > 0 && (
        <div
          className="rounded-[var(--radius)] px-4 py-3"
          style={{ background: "var(--accent)" }}
        >
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Total Hours
          </p>
          <p className="font-heading text-xl font-bold">{totalHours}</p>
        </div>
      )}

      <div>
        <label
          className="mb-1 block text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--muted-foreground)" }}
        >
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={disabled || submitting}
          rows={3}
          placeholder="What work was performed? (optional but encouraged)"
          className="w-full resize-y rounded-[var(--radius)] border px-3 py-2.5 text-sm disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
        />
      </div>

      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled || submitting}
        className="w-full rounded-[var(--radius)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: "var(--primary)" }}
      >
        {submitting ? "Saving…" : "Submit Entry"}
      </button>
    </form>
  );
}
