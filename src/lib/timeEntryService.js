import zohoSchema from "../config/zohoSchema.js";
import {
  getRecord,
  getRelatedRecords,
  searchRecords,
  insertRecord,
  updateRecord,
  deleteRecord,
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
  mockOpenedRecord,
} from "./devMocks.js";
import {
  calculateTotalHours,
  daysAgoLocal,
  toZohoDateTime,
  weekStartLocal,
} from "./timeUtils.js";

const { timeEntryModule, jobsModule, timeEntryFields, jobsFields } =
  zohoSchema;

/** Build a display label for a job record */
export function formatJobLabel(record) {
  const name = record[jobsFields.name] ?? record.Deal_Name ?? "Unnamed Job";
  const number = record[jobsFields.proposalNumber] ?? "";
  const street = record[jobsFields.street] ?? "";
  const city = record[jobsFields.city] ?? "";
  const display =
    record[jobsFields.displayAddress] ??
    [street, city].filter(Boolean).join(", ");
  const suffix = number ? ` #${number}` : "";
  if (display) return `${display} — ${name}${suffix}`;
  if (number) return `${name} #${number}`;
  return name;
}

/** Map a Zoho job record to a normalized job object */
export function mapJobRecord(record) {
  return {
    id: record.id,
    name: record[jobsFields.name] ?? record.Deal_Name ?? "",
    proposalNumber: record[jobsFields.proposalNumber] ?? "",
    street: record[jobsFields.street] ?? "",
    city: record[jobsFields.city] ?? "",
    stage: record[jobsFields.stage] ?? record.Stage ?? "",
    displayLabel: formatJobLabel(record),
  };
}

function isAllowedJobStage(job) {
  if (zohoSchema.includedStages?.length) {
    return zohoSchema.includedStages.includes(job.stage);
  }
  return !zohoSchema.excludedStages.includes(job.stage);
}

function sortJobs(jobs) {
  return jobs.sort((a, b) =>
    (a.displayLabel ?? a.name ?? "").localeCompare(
      b.displayLabel ?? b.name ?? "",
      undefined,
      { sensitivity: "base" }
    )
  );
}

function hoursPayload(totalHours) {
  return {
    [timeEntryFields.totalHours]: String(totalHours),
    [timeEntryFields.totalHoursNumber]: Number(totalHours),
  };
}

function calculateEntryHours(entry) {
  const calculated = calculateTotalHours(entry.startTime, entry.endTime);
  if (calculated !== null) return calculated;
  const stored = Number(entry.totalHours);
  return Number.isFinite(stored) ? stored : null;
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
  const rawSyncStatus = (record[timeEntryFields.syncStatus] ?? "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  const syncStatus = [
    "pending",
    "failed",
    "syncing",
    "crm_id_missing",
  ].includes(rawSyncStatus)
    ? rawSyncStatus
    : record.id
      ? "synced"
      : "pending";
  const totalHoursNumber = record[timeEntryFields.totalHoursNumber];

  return {
    id: record.id,
    jobId,
    jobName,
    date: record[timeEntryFields.date] ?? "",
    startTime: record[timeEntryFields.startTime] ?? "",
    endTime: record[timeEntryFields.endTime] ?? "",
    totalHours: String(
      record[timeEntryFields.totalHours] ?? totalHoursNumber ?? "0"
    ),
    needsHoursNumberUpdate:
      totalHoursNumber === null ||
      totalHoursNumber === undefined ||
      totalHoursNumber === "",
    notes: record[timeEntryFields.notes] ?? "",
    status: (record[timeEntryFields.status] ?? "closed").toLowerCase(),
    syncStatus,
    crmId: record.id,
  };
}

/** Fetch the signed-in CRM user */
export async function fetchCurrentUser() {
  if (!isZohoReady()) return mockCurrentUser;
  const user = await getCurrentUser();
  return user;
}

/** Fetch the CRM record the widget is opened on */
export async function fetchOpenedRecord(moduleName, recordId) {
  if (!moduleName || !recordId) return null;
  if (!isZohoReady()) return mockOpenedRecord;

  const res = await getRecord({ entity: moduleName, recordId });
  return res?.data?.[0] ?? res ?? null;
}

/** Fetch configured related-list records for the opened module record */
export async function fetchRelatedListRecords(moduleName, recordId) {
  const relatedList = zohoSchema.relatedList?.apiName;
  if (!relatedList || !moduleName || !recordId || !isZohoReady()) return [];

  try {
    const res = await getRelatedRecords({
      entity: moduleName,
      recordId,
      relatedList,
    });
    return normalizeRecords(res);
  } catch (err) {
    console.warn("Related list fetch failed:", err);
    return [];
  }
}

/** Fetch past time entries from the opened record related list */
export async function fetchRelatedHistory(moduleName, recordId) {
  if (!isZohoReady()) return mockHistory;

  const entries = await fetchRelatedListRecords(moduleName, recordId);
  return entries
    .map(mapTimeEntryRecord)
    .sort((a, b) => (b.date > a.date ? 1 : -1));
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
    return sortJobs(jobs.filter(isAllowedJobStage));
  }

  const jobs = new Map();

  if (zohoSchema.includedStages?.length) {
    const results = await Promise.allSettled(
      zohoSchema.includedStages.map((stage) =>
        searchRecords({
          entity: jobsModule,
          query: `(${jobsFields.stage}:equals:${stage})`,
        })
      )
    );
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      normalizeRecords(result.value).forEach((r) => {
        const job = mapJobRecord(r);
        if (isAllowedJobStage(job)) jobs.set(job.id, job);
      });
    }
  } else if (zohoSchema.linkingModule) {
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

  return sortJobs(Array.from(jobs.values()).filter(isAllowedJobStage));
}

/** Search Deals/jobs as the worker types */
export async function searchDeals(query) {
  const q = query.trim();
  if (!q) return [];

  if (!isZohoReady()) {
    const lower = q.toLowerCase();
    return mockJobs.filter((j) =>
      [j.displayLabel, j.name, j.street, j.city].some((value) =>
        value?.toLowerCase().includes(lower)
      ) || String(j.proposalNumber ?? "").includes(q)
    );
  }

  try {
    const wordTerms = [...new Set([q, ...q.split(/\s+/)])].filter(
      (term) => term.length >= 2
    );
    const searches = [
      ...wordTerms.map((term) =>
        searchRecords({
          entity: jobsModule,
          type: "word",
          searchValue: term,
          perPage: 20,
        })
      ),
      searchRecords({
        entity: jobsModule,
        query: `(${jobsFields.name}:starts_with:${q})`,
        perPage: 20,
      }),
    ];

    if (/^\d+$/.test(q)) {
      searches.push(
        searchRecords({
          entity: jobsModule,
          query: `(${jobsFields.proposalNumber}:equals:${q})`,
          perPage: 20,
        })
      );
    }

    const results = await Promise.allSettled(searches);
    const jobs = new Map();
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      normalizeRecords(result.value).forEach((record) => {
        const job = mapJobRecord(record);
        if (isAllowedJobStage(job)) jobs.set(job.id, job);
      });
    }
    return sortJobs(Array.from(jobs.values()));
  } catch (err) {
    console.warn("Deal search failed:", err);
    return [];
  }
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

  const query = workerCriteria(userId);

  try {
    const res = await searchRecords({
      entity: timeEntryModule,
      query,
    });
    const entries = normalizeRecords(res).map(mapTimeEntryRecord);
    return entries.find((entry) => entry.status === "open") ?? null;
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
  portalUserId,
  status = "closed",
}) {
  if (!isZohoReady()) {
    return {
      ok: true,
      id: `mock-${Date.now()}`,
      message: "Entry saved (dev mode)",
    };
  }

  const entryName = `${job.name ?? job.displayLabel ?? "Time Entry"} - ${date}`
    .slice(0, 120);
  const workerId = portalUserId ?? userId;
  const payload = {
    [timeEntryFields.name]: entryName,
    [timeEntryFields.job]: job.id,
    [timeEntryFields.date]: date,
    [timeEntryFields.startTime]: toZohoDateTime(date, startTime),
    [timeEntryFields.endTime]: toZohoDateTime(date, endTime),
    ...hoursPayload(totalHours),
    [timeEntryFields.notes]: notes ?? "",
    [timeEntryFields.worker]: { id: workerId },
    [timeEntryFields.createdByWidget]: true,
    [timeEntryFields.status]: status,
    [timeEntryFields.jobName]: job.name ?? job.displayLabel ?? "",
  };

  if (timeEntryFields.syncStatus) {
    payload[timeEntryFields.syncStatus] = "pending";
  }

  if (timeEntryFields.portalUser && portalUserId) {
    payload[timeEntryFields.portalUser] = portalUserId;
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
export async function closeOpenEntry(entryId, date, endTime, totalHours) {
  if (!isZohoReady()) {
    return { ok: true, id: entryId };
  }

  const payload = {
    [timeEntryFields.endTime]: toZohoDateTime(date, endTime),
    ...hoursPayload(totalHours),
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

export async function updateTimeEntryStatus(entryId, status) {
  if (!isZohoReady()) return { ok: true };

  const res = await updateRecord({
    entity: timeEntryModule,
    recordId: entryId,
    data: { [timeEntryFields.status]: status },
    trigger: ["workflow"],
  });

  if (isSuccessResponse(res)) return { ok: true };
  return { ok: false, error: getResponseError(res) };
}

export async function deleteTimeEntry(entryId) {
  if (!isZohoReady()) return { ok: true };

  const res = await deleteRecord({
    entity: timeEntryModule,
    recordId: entryId,
  });

  if (isSuccessResponse(res)) return { ok: true };
  return { ok: false, error: getResponseError(res) };
}

/** Re-trigger sync and refresh calculated CRM hour fields */
export async function retrySync(entry) {
  if (!isZohoReady()) {
    return { ok: true };
  }

  const totalHours = calculateEntryHours(entry);
  if (totalHours === null) {
    return { ok: false, error: "Could not calculate total hours." };
  }

  const payload = {
    ...hoursPayload(totalHours),
    [timeEntryFields.syncStatus]: "pending",
    [timeEntryFields.createdByWidget]: true,
  };

  const res = await updateRecord({
    entity: timeEntryModule,
    recordId: entry.id,
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
