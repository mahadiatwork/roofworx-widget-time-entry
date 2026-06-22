import zohoSchema from "../config/zohoSchema.js";
import {
  getRecord,
  searchRecords,
  insertRecord,
  updateRecord,
  normalizeRecords,
  isSuccessResponse,
  getResponseId,
  getResponseError,
  isZohoReady,
  getCurrentUser,
} from "./zohoClient.js";
import {
  mockCurrentUser,
  mockJobs,
  mockHistory,
} from "./devMocks.js";
import { daysAgoLocal, weekStartLocal } from "./timeUtils.js";

const { timeEntryModule, jobsModule, timeEntryFields, jobsFields } =
  zohoSchema;

/** Build a display label for a job record */
export function formatJobLabel(record) {
  const name = record[jobsFields.name] ?? record.Deal_Name ?? "Unnamed Job";
  const street = record[jobsFields.street] ?? "";
  const city = record[jobsFields.city] ?? "";
  const display =
    record[jobsFields.displayAddress] ??
    [street, city].filter(Boolean).join(", ");
  if (display) return `${display} — ${name}`;
  return name;
}

/** Map a Zoho job record to a normalized job object */
export function mapJobRecord(record) {
  return {
    id: record.id,
    name: record[jobsFields.name] ?? record.Deal_Name ?? "",
    street: record[jobsFields.street] ?? "",
    city: record[jobsFields.city] ?? "",
    stage: record[jobsFields.stage] ?? record.Stage ?? "",
    displayLabel: formatJobLabel(record),
  };
}

/** Map a Zoho time entry record to a normalized entry object */
export function mapTimeEntryRecord(record) {
  const jobLookup = record[timeEntryFields.job];
  const jobId =
    typeof jobLookup === "object" ? jobLookup?.id : jobLookup ?? "";
  const jobName =
    record[timeEntryFields.jobName] ??
    (typeof jobLookup === "object" ? jobLookup?.name : "") ??
    "";

  return {
    id: record.id,
    jobId,
    jobName,
    date: record[timeEntryFields.date] ?? "",
    startTime: record[timeEntryFields.startTime] ?? "",
    endTime: record[timeEntryFields.endTime] ?? "",
    totalHours: String(record[timeEntryFields.totalHours] ?? "0"),
    notes: record[timeEntryFields.notes] ?? "",
    status: (record[timeEntryFields.status] ?? "closed").toLowerCase(),
    syncStatus: (
      record[timeEntryFields.syncStatus] ?? "pending"
    ).toLowerCase().replace(/\s+/g, "_"),
    crmId: record.id,
  };
}

/** Fetch the signed-in CRM user */
export async function fetchCurrentUser() {
  if (!isZohoReady()) return mockCurrentUser;
  const user = await getCurrentUser();
  return user;
}

/** Build criteria to filter time entries for a worker */
function workerCriteria(userId, extra = "") {
  const workerField = timeEntryFields.worker;
  const base = `(${workerField}:equals:${userId})`;
  return extra ? `${base} and (${extra})` : base;
}

/** Load assigned active jobs for the current worker */
export async function fetchAssignedJobs(userId, prefilledJobId = null) {
  if (!isZohoReady()) {
    let jobs = [...mockJobs];
    if (prefilledJobId && !jobs.find((j) => j.id === prefilledJobId)) {
      jobs.unshift({
        id: prefilledJobId,
        name: "Current Job (from record)",
        street: "",
        city: "",
        stage: "In Progress",
        displayLabel: "Current Job (from record)",
      });
    }
    return jobs.filter(
      (j) => !zohoSchema.excludedStages.includes(j.stage)
    );
  }

  const jobs = new Map();

  if (zohoSchema.linkingModule) {
    const { module, jobField, workerField } = zohoSchema.linkingModule;
    const query = `(${workerField}:equals:${userId})`;
    const res = await searchRecords({
      entity: module,
      query,
    });
    const links = normalizeRecords(res);
    for (const link of links) {
      const jobRef = link[jobField];
      const jobId = typeof jobRef === "object" ? jobRef?.id : jobRef;
      if (jobId) {
        try {
          const jobRes = await getRecord({
            entity: jobsModule,
            recordId: jobId,
          });
          const jobData = jobRes?.data?.[0] ?? jobRes;
          if (jobData) jobs.set(jobId, mapJobRecord(jobData));
        } catch {
          /* skip inaccessible jobs */
        }
      }
    }
  } else {
    const stageExcludes = zohoSchema.excludedStages
      .map((s) => `(${jobsFields.stage}:not_equal:${s})`)
      .join(" and ");
    const assignField = jobsFields.assignedWorkers;
    const query = stageExcludes
      ? `(${assignField}:equals:${userId}) and ${stageExcludes}`
      : `(${assignField}:equals:${userId})`;

    try {
      const res = await searchRecords({ entity: jobsModule, query });
      normalizeRecords(res).forEach((r) => jobs.set(r.id, mapJobRecord(r)));
    } catch (err) {
      console.warn("Job search by assignment failed, trying broader search:", err);
    }
  }

  if (prefilledJobId && !jobs.has(prefilledJobId)) {
    try {
      const res = await getRecord({
        entity: jobsModule,
        recordId: prefilledJobId,
      });
      const jobData = res?.data?.[0] ?? res;
      if (jobData) jobs.set(prefilledJobId, mapJobRecord(jobData));
    } catch {
      /* record may not be accessible */
    }
  }

  return Array.from(jobs.values());
}

/** Fetch time entries for the last N days for a worker */
export async function fetchHistory(userId, days = zohoSchema.historyDays) {
  if (!isZohoReady()) return mockHistory;

  const since = daysAgoLocal(days);
  const dateField = timeEntryFields.date;
  const query = workerCriteria(
    userId,
    `(${dateField}:greater_equal:${since})`
  );

  try {
    const res = await searchRecords({
      entity: timeEntryModule,
      query,
    });
    const entries = normalizeRecords(res).map(mapTimeEntryRecord);
    return entries.sort((a, b) => (b.date > a.date ? 1 : -1));
  } catch (err) {
    console.error("Failed to load history:", err);
    return [];
  }
}

/** Find an open (running) clock for the worker */
export async function fetchOpenEntry(userId) {
  if (!isZohoReady()) return null;

  const statusField = timeEntryFields.status;
  const query = workerCriteria(userId, `(${statusField}:equals:open)`);

  try {
    const res = await searchRecords({
      entity: timeEntryModule,
      query,
    });
    const entries = normalizeRecords(res).map(mapTimeEntryRecord);
    return entries[0] ?? null;
  } catch (err) {
    console.error("Failed to check open entry:", err);
    return null;
  }
}

/** Create a new time entry in Zoho CRM */
export async function createTimeEntry({
  job,
  date,
  startTime,
  endTime,
  totalHours,
  notes,
  userId,
  status = "closed",
}) {
  if (!isZohoReady()) {
    return {
      ok: true,
      id: `mock-${Date.now()}`,
      message: "Entry saved (dev mode)",
    };
  }

  const payload = {
    [timeEntryFields.job]: job.id,
    [timeEntryFields.date]: date,
    [timeEntryFields.startTime]: startTime,
    [timeEntryFields.endTime]: endTime,
    [timeEntryFields.totalHours]: totalHours,
    [timeEntryFields.notes]: notes ?? "",
    [timeEntryFields.worker]: userId,
    [timeEntryFields.createdByWidget]: true,
    [timeEntryFields.status]: status,
    [timeEntryFields.jobName]: job.name ?? job.displayLabel ?? "",
  };

  if (timeEntryFields.syncStatus) {
    payload[timeEntryFields.syncStatus] = "pending";
  }

  const res = await insertRecord({
    entity: timeEntryModule,
    data: payload,
    trigger: ["workflow"],
  });

  if (isSuccessResponse(res)) {
    return { ok: true, id: getResponseId(res) };
  }
  return { ok: false, error: getResponseError(res) };
}

/** Close an open entry by setting end time and status */
export async function closeOpenEntry(entryId, endTime, totalHours) {
  if (!isZohoReady()) {
    return { ok: true, id: entryId };
  }

  const payload = {
    [timeEntryFields.endTime]: endTime,
    [timeEntryFields.totalHours]: totalHours,
    [timeEntryFields.status]: "closed",
  };

  const res = await updateRecord({
    entity: timeEntryModule,
    recordId: entryId,
    data: payload,
    trigger: ["workflow"],
  });

  if (isSuccessResponse(res)) {
    return { ok: true, id: entryId };
  }
  return { ok: false, error: getResponseError(res) };
}

/** Re-trigger sync for a failed/pending entry (sets sync status back to pending) */
export async function retrySync(entryId) {
  if (!isZohoReady()) {
    return { ok: true };
  }

  const payload = {
    [timeEntryFields.syncStatus]: "pending",
    [timeEntryFields.createdByWidget]: true,
  };

  const res = await updateRecord({
    entity: timeEntryModule,
    recordId: entryId,
    data: payload,
    trigger: ["workflow"],
  });

  if (isSuccessResponse(res)) {
    return { ok: true };
  }
  return { ok: false, error: getResponseError(res) };
}

/** Filter history to current week (Mon–Sun) and sum hours */
export function getWeeklyHours(entries) {
  const weekStart = weekStartLocal();
  const weekEntries = entries.filter((e) => e.date >= weekStart);
  return weekEntries.reduce((sum, e) => {
    const h = parseFloat(e.totalHours);
    return sum + (Number.isFinite(h) ? h : 0);
  }, 0);
}
