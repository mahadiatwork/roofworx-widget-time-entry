import zohoSchema from "../config/zohoSchema.js";
import { closePopupReload } from "../lib/zohoClient.js";
import { formatTimeDisplay } from "../lib/timeUtils.js";
import StatusBadge from "./StatusBadge.jsx";

function crmTimeEntryUrl(recordId) {
  if (!recordId || typeof window === "undefined") return null;

  const crmPage = document.referrer || window.location.href;
  const base =
    crmPage.match(/^https:\/\/[^/]+\/crm\/[^/]+/)?.[0] ??
    "https://crm.zoho.com/crm/roofworx";

  return `${base}/tab/${zohoSchema.timeEntryTab}/${recordId}`;
}

export default function ConfirmationCard({ entry, onAddAnother }) {
  const crmUrl = crmTimeEntryUrl(entry.crmId);

  async function handleCloseReload() {
    const data = await closePopupReload();
    console.log(data);
  }

  return (
    <div
      className="rounded-[var(--radius)] border p-4"
      style={{
        borderColor: "#bbf7d0",
        background: "rgba(240, 253, 244, 0.9)",
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="font-heading text-sm font-bold text-green-900">
          Entry saved successfully
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status="record_created" />
          <button
            type="button"
            onClick={handleCloseReload}
            className="rounded-[var(--radius)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
            style={{ background: "var(--primary)" }}
          >
            Close & Reload
          </button>
        </div>
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

      {crmUrl && (
        <a
          href={crmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full rounded-[var(--radius)] px-4 py-2 text-center text-sm font-medium text-white"
          style={{ background: "var(--primary)" }}
        >
          Open Time Sheet
        </a>
      )}

      {onAddAnother && (
        <button
          type="button"
          onClick={onAddAnother}
          className="mt-2 w-full rounded-[var(--radius)] border px-4 py-2 text-sm font-medium"
          style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
        >
          Add Another Entry
        </button>
      )}
    </div>
  );
}
