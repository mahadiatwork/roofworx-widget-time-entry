import { formatTimeDisplay } from "../lib/timeUtils.js";
import StatusBadge from "./StatusBadge.jsx";

export default function ConfirmationCard({ entry, onAddAnother }) {
  return (
    <div
      className="rounded-[var(--radius)] border p-4"
      style={{
        borderColor: "#bbf7d0",
        background: "rgba(240, 253, 244, 0.9)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-heading text-sm font-bold text-green-900">
          Entry saved successfully
        </p>
        <StatusBadge status="record_created" />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-green-900">
        <div className="col-span-2">
          <dt
            className="text-xs uppercase tracking-wide text-green-700"
          >
            Job
          </dt>
          <dd className="font-medium">
            {entry.job?.displayLabel ?? entry.jobName}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-green-700">
            Date
          </dt>
          <dd className="font-medium">{entry.date}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-green-700">
            Total Hours
          </dt>
          <dd className="font-heading text-lg font-bold">{entry.totalHours}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-green-700">
            Start
          </dt>
          <dd className="font-medium">
            {formatTimeDisplay(entry.startTime)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-green-700">
            End
          </dt>
          <dd className="font-medium">
            {formatTimeDisplay(entry.endTime)}
          </dd>
        </div>
        {entry.notes && (
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-green-700">
              Notes
            </dt>
            <dd className="font-medium">{entry.notes}</dd>
          </div>
        )}
      </dl>

      <p className="mt-3 text-xs text-green-700">
        Your time is being sent to CRM time sheets in the background.
      </p>

      {onAddAnother && (
        <button
          type="button"
          onClick={onAddAnother}
          className="mt-4 w-full rounded-[var(--radius)] px-4 py-2 text-sm font-medium text-white"
          style={{ background: "var(--primary)" }}
        >
          Add Another Entry
        </button>
      )}
    </div>
  );
}
