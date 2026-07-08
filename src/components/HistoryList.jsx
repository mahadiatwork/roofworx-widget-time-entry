import { formatTimeDisplay } from "../lib/timeUtils.js";
import StatusBadge from "./StatusBadge.jsx";

export default function HistoryList({
  entries,
  onSyncNow,
  onUpdateMissingHours,
  onStatusChange,
  onDelete,
  syncingId = null,
  updatingMissingHours = false,
  editingId = null,
}) {
  if (!entries.length) {
    return (
      <div
        className="rounded-[var(--radius)] border px-4 py-6 text-center text-sm"
        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
      >
        No time entries in the last 30 days.
      </div>
    );
  }

  const missingHoursCount = entries.filter(
    (entry) => entry.needsHoursNumberUpdate && entry.crmId
  ).length;

  return (
    <div className="space-y-3">
      {missingHoursCount > 0 && onUpdateMissingHours && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onUpdateMissingHours}
            disabled={updatingMissingHours || !!syncingId}
            className="rounded-[var(--radius)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {updatingMissingHours ? "Updating..." : `Update All (${missingHoursCount})`}
          </button>
        </div>
      )}

      {entries.map((entry) => {
        const canRetry =
          entry.needsHoursNumberUpdate ||
          entry.syncStatus === "failed" ||
          entry.syncStatus === "pending" ||
          entry.syncStatus === "crm_id_missing";
        const isSyncing = syncingId === entry.id;
        const isEditing = editingId === entry.id;
        const syncLabel = entry.needsHoursNumberUpdate ? "Update CRM" : "Sync now";

        return (
          <article
            key={entry.id}
            className="rounded-[var(--radius)] border p-4"
            style={{ borderColor: "var(--border)", background: "var(--background)" }}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">{entry.jobName}</p>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {entry.date}
                </p>
              </div>
              <StatusBadge
                status={isSyncing ? "syncing" : entry.syncStatus}
                showSpinner={isSyncing}
              />
            </div>

            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt
                  className="text-xs uppercase tracking-wide"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Start
                </dt>
                <dd>{formatTimeDisplay(entry.startTime)}</dd>
              </div>
              <div>
                <dt
                  className="text-xs uppercase tracking-wide"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  End
                </dt>
                <dd>{formatTimeDisplay(entry.endTime)}</dd>
              </div>
              <div>
                <dt
                  className="text-xs uppercase tracking-wide"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Hours
                </dt>
                <dd className="font-heading font-bold">{entry.totalHours}</dd>
              </div>
            </dl>

            {entry.notes && (
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                {entry.notes}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {entry.crmId && (
                <p
                  className="truncate text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  CRM ref: {entry.crmId}
                </p>
              )}
              <div className="flex items-center gap-2">
                {onStatusChange && (
                  <select
                    value={entry.status}
                    onChange={(e) => onStatusChange(entry, e.target.value)}
                    disabled={isEditing || updatingMissingHours}
                    className="rounded-[var(--radius)] border px-2 py-1 text-xs disabled:opacity-50"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                )}
                {canRetry && onSyncNow && (
                  <button
                    type="button"
                    onClick={() => onSyncNow(entry)}
                    disabled={isSyncing || isEditing || updatingMissingHours}
                    className="shrink-0 text-xs font-medium underline disabled:opacity-50"
                    style={{ color: "var(--primary)" }}
                  >
                    {isSyncing ? "Updating..." : syncLabel}
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(entry)}
                    disabled={isEditing || updatingMissingHours}
                    className="shrink-0 text-xs font-medium underline disabled:opacity-50"
                    style={{ color: "var(--destructive)" }}
                  >
                    {isEditing ? "Working…" : "Delete"}
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
