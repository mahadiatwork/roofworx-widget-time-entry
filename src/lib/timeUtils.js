/**
 * Time calculation and formatting utilities.
 */

/** Parse "HH:MM" or "H:MM AM/PM" into minutes since midnight */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();

  const iso = trimmed.match(/T(\d{2}):(\d{2}):/);
  if (iso) return parseInt(iso[1], 10) * 60 + parseInt(iso[2], 10);

  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let hours = parseInt(ampm[1], 10);
    const minutes = parseInt(ampm[2], 10);
    const period = ampm[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const h24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    return parseInt(h24[1], 10) * 60 + parseInt(h24[2], 10);
  }

  return null;
}

/** Format minutes since midnight as "HH:MM" (24h) */
export function formatMinutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Format "HH:MM" (24h) to display "7:00 AM" */
export function formatTimeDisplay(time24) {
  const mins = parseTimeToMinutes(time24);
  if (mins === null) return time24;
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${String(m).padStart(2, "0")} ${period}`;
}

/** Calculate total hours between start and end (24h "HH:MM") */
export function calculateTotalHours(startTime, endTime) {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null) return null;
  if (end <= start) return null;
  const diffMins = end - start;
  const hours = diffMins / 60;
  return Math.round(hours * 100) / 100;
}

/** Format local date + time for Zoho DateTime fields: YYYY-MM-DDTHH:mm:ss±HH:MM */
export function toZohoDateTime(date, time) {
  const mins = parseTimeToMinutes(time);
  if (!date || mins === null) return "";

  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  const d = new Date(`${date}T00:00:00`);
  d.setHours(hours, minutes, 0, 0);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, "0");

  return `${y}-${m}-${day}T${hh}:${mm}:00${sign}${offsetHours}:${offsetMinutes}`;
}

/** Today's date as YYYY-MM-DD in local timezone */
export function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Date N days ago as YYYY-MM-DD */
export function daysAgoLocal(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the current week (local) as YYYY-MM-DD */
export function weekStartLocal() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Sunday of the current week (local) as YYYY-MM-DD */
export function weekEndLocal() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Sum total hours from an array of entries */
export function sumHours(entries) {
  return entries.reduce((sum, e) => {
    const h = parseFloat(e.totalHours);
    return sum + (Number.isFinite(h) ? h : 0);
  }, 0);
}

/** Validate entry form — returns error message or null */
export function validateEntry({ job, date, startTime, endTime }) {
  if (!job?.id) return "Please select a job before saving.";
  if (!date) return "A date is required.";
  if (!startTime) return "Start time is required.";
  if (!endTime) return "End time is required.";
  const total = calculateTotalHours(startTime, endTime);
  if (total === null || total <= 0) {
    return "End time must be after start time.";
  }
  return null;
}
