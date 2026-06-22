import { useCallback, useEffect, useState } from "react";
import zohoSchema from "./config/zohoSchema.js";
import {
  initZoho,
  resizeWidget,
  isZohoReady,
} from "./lib/zohoClient.js";
import { getRecordId } from "./lib/zohoPageContext.js";
import {
  fetchCurrentUser,
  fetchAssignedJobs,
  fetchHistory,
  fetchOpenEntry,
  createTimeEntry,
  closeOpenEntry,
  retrySync,
  getWeeklyHours,
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
  const [devMode, setDevMode] = useState(false);
  const [activeTab, setActiveTab] = useState("entry");

  const userId = user?.id ?? user?.ID ?? null;

  const refreshData = useCallback(async (uid, jobId) => {
    const [jobList, hist, open] = await Promise.all([
      fetchAssignedJobs(uid, jobId),
      fetchHistory(uid),
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
          const jobId = getRecordId(mockPageLoad);
          await refreshData(mockUser.id, jobId);
          if (cancelled) return;
          setLoading(false);
          return;
        }

        await initZoho(async (pageLoad) => {
          if (cancelled) return;
          resizeWidget("100%", "100%");

          const currentUser = await fetchCurrentUser();
          if (cancelled) return;
          setUser(currentUser);

          const uid = currentUser?.id ?? currentUser?.ID;
          const jobId = getRecordId(pageLoad);
          await refreshData(uid, jobId);
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
  }, [refreshData]);

  async function handleSubmit(formData) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await createTimeEntry({
        ...formData,
        userId,
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
      await refreshData(userId, prefilledJob?.id);
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
        closeEndTime,
        String(totalHours)
      );
      if (!result.ok) {
        setCloseError(result.error ?? "Failed to close entry.");
        return;
      }
      setOpenEntry(null);
      setShowOpenClock(false);
      await refreshData(userId, prefilledJob?.id);
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
      const result = await retrySync(entry.id);
      if (!result.ok) {
        setError(result.error ?? "Sync failed.");
      }
      await refreshData(userId, prefilledJob?.id);
    } catch (err) {
      console.error(err);
      setError("Sync failed. Please try again.");
    } finally {
      setSyncingId(null);
    }
  }

  const weeklyHours = getWeeklyHours(history);
  const showOpenBanner = openEntry && showOpenClock && !confirmation;

  if (loading) {
    return (
      <div className="p-4">
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
    <div className="mx-auto max-w-lg">
      <WidgetHeader
        subtitle={
          devMode
            ? "Dev mode — Zoho SDK not detected"
            : user?.full_name ?? user?.email ?? undefined
        }
      />

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
            syncingId={syncingId}
          />
        )}
      </div>
    </div>
  );
}
