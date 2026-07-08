import { useCallback, useEffect, useState } from "react";
import zohoSchema from "./config/zohoSchema.js";
import {
  initZoho,
  resizeWidget,
  isZohoReady,
} from "./lib/zohoClient.js";
import { getModuleName, getRecordId } from "./lib/zohoPageContext.js";
import {
  fetchCurrentUser,
  fetchOpenedRecord,
  fetchRelatedHistory,
  fetchAssignedJobs,
  fetchHistory,
  fetchOpenEntry,
  createTimeEntry,
  closeOpenEntry,
  deleteTimeEntry,
  retrySync,
  getWeeklyHours,
  searchDeals,
  updateTimeEntryStatus,
} from "./lib/timeEntryService.js";
import {
  calculateTotalHours,
  validateEntry,
} from "./lib/timeUtils.js";
import { mockPageLoad } from "./lib/devMocks.js";
import WidgetHeader from "./components/WidgetHeader.jsx";
import WeeklySummary from "./components/WeeklySummary.jsx";
import EntryForm from "./components/EntryForm.jsx";
import OpenClockBanner from "./components/OpenClockBanner.jsx";
import ConfirmationCard from "./components/ConfirmationCard.jsx";
import HistoryList from "./components/HistoryList.jsx";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [pageContext, setPageContext] = useState({
    moduleName: null,
    recordId: null,
  });
  const [openedRecord, setOpenedRecord] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [prefilledJob, setPrefilledJob] = useState(null);
  const [history, setHistory] = useState([]);
  const [openEntry, setOpenEntry] = useState(null);
  const [showOpenClock, setShowOpenClock] = useState(true);
  const [confirmation, setConfirmation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeEndTime, setCloseEndTime] = useState("");
  const [closeError, setCloseError] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [updatingMissingHours, setUpdatingMissingHours] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [devMode, setDevMode] = useState(false);
  const [activeTab, setActiveTab] = useState("entry");

  const userId = user?.id ?? user?.ID ?? null;

  const loadOpenedContext = useCallback(async (pageLoad) => {
    const context = {
      moduleName: getModuleName(pageLoad),
      recordId: getRecordId(pageLoad),
    };
    setPageContext(context);

    const record = await fetchOpenedRecord(context.moduleName, context.recordId);
    setOpenedRecord(record);
    return context;
  }, []);

  const refreshData = useCallback(async (uid, jobId, context = {}) => {
    const [jobList, hist, open] = await Promise.all([
      fetchAssignedJobs(uid, jobId),
      context.recordId
        ? fetchRelatedHistory(context.moduleName, context.recordId)
        : fetchHistory(uid),
      fetchOpenEntry(uid),
    ]);
    setJobs(jobList);
    setHistory(hist);
    setOpenEntry(open);
    if (jobId) {
      const match = jobList.find((j) => j.id === jobId);
      if (match) setPrefilledJob(match);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const inZoho = isZohoReady();

        if (!inZoho) {
          setDevMode(true);
          const mockUser = await fetchCurrentUser();
          if (cancelled) return;
          setUser(mockUser);
          const context = await loadOpenedContext(mockPageLoad);
          const jobId =
            context.moduleName === zohoSchema.jobsModule ? context.recordId : null;
          await refreshData(mockUser.id, jobId, context);
          if (cancelled) return;
          setLoading(false);
          return;
        }

        await initZoho(async (pageLoad) => {
          if (cancelled) return;
          resizeWidget("760px", "740px");

          const currentUser = await fetchCurrentUser();
          if (cancelled) return;
          setUser(currentUser);

          const uid = currentUser?.id ?? currentUser?.ID;
          const context = await loadOpenedContext(pageLoad);
          const jobId =
            context.moduleName === zohoSchema.jobsModule ? context.recordId : null;
          await refreshData(uid, jobId, context);
          if (cancelled) return;
          setLoading(false);
        });
      } catch (err) {
        console.error("Widget boot failed:", err);
        if (!cancelled) {
          setError("Failed to initialize the widget. Please refresh the page.");
          setLoading(false);
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [loadOpenedContext, refreshData]);

  async function handleSubmit(formData) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await createTimeEntry({
        ...formData,
        userId,
        portalUserId:
          pageContext.moduleName === zohoSchema.portalUserModule
            ? pageContext.recordId
            : null,
        status: "closed",
      });

      if (!result.ok) {
        setError(result.error ?? "Failed to save entry.");
        return;
      }

      setConfirmation({
        ...formData,
        crmId: result.id,
      });
      setActiveTab("entry");
      await refreshData(userId, prefilledJob?.id, pageContext);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCloseOpenEntry() {
    const validationError = validateEntry({
      job: { id: openEntry.jobId },
      date: openEntry.date,
      startTime: openEntry.startTime,
      endTime: closeEndTime,
    });
    if (validationError) {
      setCloseError(validationError);
      return;
    }

    setClosing(true);
    setCloseError(null);
    const totalHours = calculateTotalHours(openEntry.startTime, closeEndTime);

    try {
      const result = await closeOpenEntry(
        openEntry.id,
        openEntry.date,
        closeEndTime,
        String(totalHours)
      );
      if (!result.ok) {
        setCloseError(result.error ?? "Failed to close entry.");
        return;
      }
      setOpenEntry(null);
      setShowOpenClock(false);
      await refreshData(userId, prefilledJob?.id, pageContext);
    } catch (err) {
      console.error(err);
      setCloseError("Failed to close entry. Please try again.");
    } finally {
      setClosing(false);
    }
  }

  async function handleSyncNow(entry) {
    setSyncingId(entry.id);
    try {
      const result = await retrySync(entry);
      if (!result.ok) {
        setError(result.error ?? "Sync failed.");
      }
      await refreshData(userId, prefilledJob?.id, pageContext);
    } catch (err) {
      console.error(err);
      setError("Sync failed. Please try again.");
    } finally {
      setSyncingId(null);
    }
  }

  async function handleUpdateMissingHours() {
    const targets = history.filter(
      (entry) => entry.needsHoursNumberUpdate && entry.crmId
    );
    if (!targets.length) return;

    setUpdatingMissingHours(true);
    setError(null);
    let failed = 0;

    try {
      for (const entry of targets) {
        setSyncingId(entry.id);
        try {
          const result = await retrySync(entry);
          if (!result.ok) failed += 1;
        } catch (err) {
          console.error(err);
          failed += 1;
        }
      }
      if (failed) {
        setError(
          `${failed} time ${failed === 1 ? "entry" : "entries"} failed to update.`
        );
      }
      await refreshData(userId, prefilledJob?.id, pageContext);
    } finally {
      setUpdatingMissingHours(false);
      setSyncingId(null);
    }
  }

  async function handleStatusChange(entry, status) {
    setEditingHistoryId(entry.id);
    setError(null);
    try {
      const result = await updateTimeEntryStatus(entry.id, status);
      if (!result.ok) {
        setError(result.error ?? "Failed to update status.");
        return;
      }
      await refreshData(userId, prefilledJob?.id, pageContext);
    } catch (err) {
      console.error(err);
      setError("Failed to update status. Please try again.");
    } finally {
      setEditingHistoryId(null);
    }
  }

  async function handleDeleteEntry(entry) {
    if (!window.confirm("Delete this time entry?")) return;

    setEditingHistoryId(entry.id);
    setError(null);
    try {
      const result = await deleteTimeEntry(entry.id);
      if (!result.ok) {
        setError(result.error ?? "Failed to delete entry.");
        return;
      }
      await refreshData(userId, prefilledJob?.id, pageContext);
    } catch (err) {
      console.error(err);
      setError("Failed to delete entry. Please try again.");
    } finally {
      setEditingHistoryId(null);
    }
  }

  const weeklyHours = getWeeklyHours(history);
  const showOpenBanner = openEntry && showOpenClock && !confirmation;
  const portalNameField = zohoSchema.portalUserFields?.displayName;
  const portalNameValue = portalNameField ? openedRecord?.[portalNameField] : null;
  const portalName =
    typeof portalNameValue === "object"
      ? portalNameValue?.name
      : portalNameValue;
  const headerSubtitle =
    portalName ||
    (devMode
      ? "Dev mode — Zoho SDK not detected"
      : user?.full_name ?? user?.email ?? undefined);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[700px] p-4">
        <WidgetHeader />
        <div
          className="mt-4 rounded-[var(--radius)] px-4 py-8 text-center text-sm"
          style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
        >
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[700px]">
      <WidgetHeader subtitle={headerSubtitle} />

      <div className="space-y-4 p-4">
        {error && (
          <div
            className="rounded-[var(--radius)] border px-4 py-3 text-sm"
            style={{
              borderColor: "#fecaca",
              background: "#fef2f2",
              color: "var(--destructive)",
            }}
          >
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <WeeklySummary hours={weeklyHours} />

        <div
          className="flex rounded-[var(--radius)] border p-1"
          style={{ borderColor: "var(--border)" }}
        >
          {["entry", "history"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="flex-1 rounded-[calc(var(--radius)-2px)] py-2 text-sm font-medium capitalize transition-colors"
              style={
                activeTab === tab
                  ? { background: "var(--primary)", color: "#fff" }
                  : { color: "var(--muted-foreground)" }
              }
            >
              {tab === "entry" ? "New Entry" : "History"}
            </button>
          ))}
        </div>

        {activeTab === "entry" && (
          <div
            className="rounded-[var(--radius)] border p-4"
            style={{ borderColor: "var(--border)" }}
          >
            {confirmation ? (
              <ConfirmationCard
                entry={confirmation}
                onAddAnother={() => setConfirmation(null)}
              />
            ) : showOpenBanner ? (
              <OpenClockBanner
                entry={openEntry}
                endTime={closeEndTime}
                onEndTimeChange={setCloseEndTime}
                onClose={handleCloseOpenEntry}
                onDismiss={() => setShowOpenClock(false)}
                closing={closing}
                error={closeError}
              />
            ) : (
              <EntryForm
                key={prefilledJob?.id ?? "no-prefill"}
                jobs={jobs}
                initialJob={prefilledJob}
                onSearchJobs={searchDeals}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            )}
          </div>
        )}

        {activeTab === "history" && (
          <HistoryList
            entries={history}
            onSyncNow={handleSyncNow}
            onUpdateMissingHours={handleUpdateMissingHours}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteEntry}
            syncingId={syncingId}
            updatingMissingHours={updatingMissingHours}
            editingId={editingHistoryId}
          />
        )}
      </div>
    </div>
  );
}
