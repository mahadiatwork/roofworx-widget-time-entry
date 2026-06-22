const STATUS_CONFIG = {
  open: { label: "Open", className: "status-open pulse" },
  syncing: { label: "Syncing", className: "status-syncing" },
  synced: { label: "Synced", className: "status-synced" },
  pending: { label: "Pending", className: "status-pending" },
  failed: { label: "Failed", className: "status-failed" },
  crm_id_missing: { label: "CRM ID Missing", className: "status-crm-id-missing" },
  record_created: { label: "Saved", className: "status-record-created" },
};

export default function StatusBadge({ status, showSpinner = false }) {
  const key = (status ?? "pending").toLowerCase().replace(/\s+/g, "_");
  const config = STATUS_CONFIG[key] ?? STATUS_CONFIG.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {showSpinner && (
        <svg
          className="spinner h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {config.label}
    </span>
  );
}
