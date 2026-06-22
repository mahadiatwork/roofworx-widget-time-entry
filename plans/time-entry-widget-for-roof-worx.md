# Time Entry Widget for Roof Worx

## 1. Purpose

The purpose of this widget is to let Roof Worx field crew capture the hours they work on a job directly from inside the CRM, without having to leave the CRM screen or open a separate application. The widget brings the same time-capture experience that exists in the field app today into the CRM record itself, so that a worker can log time against the job they are looking at in the moment, with the job context already known.

This plan describes, in business terms, what the widget must do, what information is captured, the rules that govern that information, and the experience the worker should have when using it.

## 2. Background

Roof Worx currently uses a field application for crew to log the time they spend on roofing jobs. Each time entry is tied to a specific job (a project/deal in the CRM) and to the worker who performed the work. Those entries are ultimately sent to the CRM's time sheet records so that labor hours can be tracked against each job, reviewed by office staff, and used for payroll and job-cost reporting.

Today the worker enters this information in a separate application. The goal of the widget is to allow the same entry to be made from within the CRM, in the context of the job record the worker (or office staff) is viewing. This reduces double entry, removes the need to switch between systems, and makes it more likely that time is captured accurately and promptly while the details are fresh.

## 3. Who Uses It

The widget is used by **field workers and contractors** who perform work on Roof Worx jobs and need to record the hours they worked. The person logged into the CRM is automatically treated as the person the time belongs to. In other words, the widget attributes the entry to the signed-in user; the worker does not need to pick their own name from a list.

Office staff who view a job record may also see the widget, but the primary actor entering time is the field worker.

## 4. Where the Widget Appears

The widget is embedded inside a CRM record — specifically, inside a **job/project record**. Because the widget is already on the job record, it can pre-fill the job for the worker so they do not have to search for it. The worker should still be able to change the job if needed (for example, to log time against a different job from the same screen), but the default selection should match the record the widget is sitting on.

## 5. Information Captured on a Time Entry

When a worker enters time, the following pieces of information are captured. Each is described below in business terms, along with whether it is entered by the worker, automatically known by the system, or calculated by the system.

### 5.1 Job (entered by the worker, required)

The job the time is being logged against. This is the roofing project the work was performed on. The worker selects the job from a searchable list of the jobs they have been assigned to. When the widget is opened from inside a job record, this field is pre-filled with that job. A job is identified to the worker by its address (street and city) and its job name. The worker must choose a job before the entry can be saved.

### 5.2 Date (entered by the worker, required)

The calendar date the work was performed. This defaults to today's date (in the worker's local time) so that the common case — entering time for the same day — requires no action. The worker can change the date if they are entering time for a prior day. A date is required.

### 5.3 Start Time (entered by the worker, required)

The time the worker began working on the job that day. This is entered in a standard clock format (for example, 7:00 AM). It defaults to 7:00 AM, which is the typical Roof Worx start time, but the worker can change it. A start time is required.

### 5.4 End Time (entered by the worker, required)

The time the worker finished working on the job that day. This is entered in the same clock format as the start time. An end time is required, and it must be later than the start time — an entry where the end time is before or equal to the start time is not valid and cannot be saved.

### 5.5 Notes (entered by the worker, optional)

A free-text description of the work performed during the shift. This is where the worker can capture what they actually did on the job that day — for example, the stage of the roof, materials installed, issues encountered, or anything worth noting for the office or for the job record. Notes are optional, but encouraged, because they give context to the hours that payroll and project managers cannot get from the times alone.

### 5.6 Worker (automatically known, not entered)

The person the time belongs to. The widget attributes the entry to the signed-in user. The worker never has to select their own name; the system already knows who they are.

### 5.7 Total Hours (calculated by the system, not entered)

The total number of hours worked, calculated from the start and end times. The worker does not type this number; the system works it out and shows it back. This is the figure used for payroll and for tracking labor hours against the job.

### 5.8 Time Sheet Reference (created by the system, not entered)

Once the entry is sent to the CRM, a time sheet record is created and given a unique reference. The widget keeps hold of this reference so that the entry in the widget and the time sheet in the CRM can be matched up later. The worker does not need to do anything with this reference; it is held for record-keeping and troubleshooting.

## 6. Business Rules

The following rules govern what is and is not allowed when entering time.

1. **A job must be selected.** An entry cannot be saved without a job.
2. **A date is required** and defaults to today.
3. **Both start and end times are required.**
4. **End time must be after start time.** If the worker enters an end time that is earlier than or equal to the start time, the widget should not allow the entry to be saved and should tell the worker what is wrong.
5. **Only one running clock per worker at a time.** A worker can have at most one "open" time entry — one where the clock has started but not yet been ended. If the worker starts a new entry while another is still open, they should be made aware of the open entry and given the chance to close it (set the end time) or switch to it before starting another. This prevents overlapping time and double-counted hours.
6. **Total hours are calculated, never typed.** This avoids human error in arithmetic and keeps the hours consistent with the times.
7. **The entry is attributed to the signed-in worker.** A worker cannot log time on behalf of another worker through this widget.
8. **The job list only shows jobs the worker is assigned to.** A worker should not see or select jobs they are not permitted to work on. (When the widget is opened from a specific job record, that job is shown regardless, but the broader job list is filtered to the worker's assignments.)

## 7. The Entry Experience (Step by Step)

A typical use of the widget follows this flow:

1. The worker opens the job record in the CRM, and the widget appears with the job already filled in.
2. The date shows today's date. If the worker is entering time for a different day, they change the date.
3. The start time shows the default 7:00 AM. The worker adjusts it if they started at a different time.
4. The worker enters the end time.
5. The worker adds any notes about the work performed.
6. The worker submits the entry.
7. The widget confirms that the entry was saved, showing the job, date, times, and total hours back to the worker so they can verify what was recorded.
8. The entry is then sent to the CRM's time sheet records in the background.

If the worker has an open (still-running) clock from a previous entry, the widget should surface that open entry first, before letting them start a new one, so that the open entry can be closed out and hours are not lost or double counted.

## 8. What Happens After Submission

Once the worker submits an entry, two things happen:

- **Immediate confirmation.** The worker sees a clear confirmation that the entry was saved, along with a summary of what was recorded (job, date, start time, end time, and total hours). This gives the worker confidence that their time was captured and lets them spot any mistake right away.
- **Sending to the CRM time sheets.** The entry is then sent to the CRM so it becomes a time sheet record tied to the job and to the worker. This step happens in the background; the worker does not need to wait for it to finish before moving on.

Because the sending happens in the background, the widget should always keep a status on each entry so that the worker (and office staff) can see whether the entry has reached the CRM yet. The possible statuses are:

- **Pending** — the entry has been saved but has not yet reached the CRM time sheets.
- **Syncing** — the entry is currently being sent to the CRM.
- **Synced** — the entry has been successfully recorded in the CRM time sheets.
- **Failed** — the entry could not be sent to the CRM, and the system will try again. The worker should be able to trigger another attempt ("Sync now") for entries that failed or that are missing their CRM reference.
- **CRM ID Missing** — the entry is marked as sent, but the link back to the CRM time sheet was not recorded. This is an edge case that should be surfaced so it can be reconciled.

The worker should be able to manually request that a pending or failed entry be sent again, rather than waiting indefinitely or contacting support.

## 9. Viewing Past Entries

The widget should let the worker see the time entries they have recently submitted. The history should show **the last 30 days** of entries, and for each entry display:

- The job name
- The date
- The start and end times
- The total hours
- Any notes that were entered
- The current sync status (pending, syncing, synced, failed, CRM ID missing)
- The CRM time sheet reference, when one exists

This view is read-only. **Edits to an entry must be made in the CRM itself, not through the widget.** The widget should make this clear so that a worker who needs to correct a mistake knows to ask the office or to edit the time sheet record in the CRM. This keeps a single source of truth for time sheet changes and avoids the situation where the widget and the CRM disagree.

The worker should also be able to see a running total of **hours worked so far this week** (week running Monday through Sunday), so they have a quick sense of where they stand against their expected hours.

## 10. Edge Cases and Exceptions

- **Working offline or losing connection.** If the worker submits an entry while the connection is unreliable, the entry should still be saved and shown as pending. It should be sent to the CRM automatically once the connection is available again, without the worker having to re-enter anything.
- **Job assignment changes.** If a worker is removed from a job after they have already logged time against it, their past entries should remain visible and intact. The job list for *new* entries should reflect the worker's current assignments only.
- **Failed send to the CRM.** If the CRM is unavailable when an entry is submitted, the entry should remain pending and be retried automatically. The worker should not lose the entry, and they should be able to see that it has not yet reached the CRM.
- **Closed/lost jobs.** Jobs that are no longer active (for example, jobs marked as closed-lost) should not appear in the list of jobs available for new time entries.
- **Open clock left running.** If a worker forgets to end a clock from a previous day, the widget should remind them of the open entry so it can be closed out rather than left running indefinitely.

## 11. Out of Scope

The following are intentionally **not** part of this widget and should be handled elsewhere:

- **Editing or deleting submitted time entries.** As noted above, edits happen in the CRM time sheet record, not in the widget.
- **Approving time for payroll.** Approval is an office/management activity that happens in the CRM, not in this widget.
- **Entering expenses.** Roof Worx captures expenses separately; this widget is only for time. A separate expense widget or flow exists for expenses.
- **Managing job details, colors, materials, or work orders.** Those live on the job record in the CRM and are not entered through the time widget. The time widget only consumes the job as context.

## 12. Success Criteria

The widget can be considered successful when:

1. A worker can open a job in the CRM and log time against it in a single, short interaction without leaving the CRM.
2. The job, date, times, notes, and worker are captured accurately every time, with total hours calculated correctly.
3. Each entry reliably becomes a time sheet record in the CRM, with a clear status shown back to the worker at every stage.
4. Workers can see their recent entries and their hours for the current week at a glance.
5. Mistakes in submission (missing job, end before start, etc.) are caught and explained in plain language before anything is saved.
6. Failures to reach the CRM do not result in lost entries; they are retried and can be retried manually.
7. Edits remain a CRM-only activity, so there is one consistent source of truth for time sheets.

## 13. Color Combinations (Roof Worx Brand Palette)

So that the widget looks and feels like the rest of the Roof Worx field app, the same color palette must be used. The palette is described below in plain terms and is followed by the exact color values a developer will need. The exact values are given in **hex** and in **HSL** (the app stores them as HSL). A developer building the widget should use these same values so the result is visually consistent with the existing app.

### 13.1 Primary Brand Color — warm taupe / beige

This is the main Roof Worx brand color. It is used for the primary action buttons (such as **Submit Entry** and **Add Time Entry**), for clickable links, for icons that accompany labels, and for the focus ring that appears around an active input field. It is a soft, sandy beige tone.

- Hex: **#C2A88D**
- HSL: **hsl(31, 33%, 66%)**
- Text on top of this color should be **white**.

### 13.2 Secondary Color — dark charcoal gray

This is the dark color used for the top header bars at the top of each screen, for the page title text inside those bars, and for section heading text. It is near-black but slightly softer than pure black.

- Hex: **#2D2D2D**
- HSL: **hsl(0, 0%, 18%)**
- Text on top of this color should be **white**.

### 13.3 Background — white

The main background of every screen is plain white, so the content and the cards sit cleanly on it.

- Hex: **#FFFFFF**
- HSL: **hsl(0, 0%, 100%)**

### 13.4 Foreground / Body Text — dark gray

The standard color for body text and labels. It is the same dark gray as the secondary color, used for readable text on the white background.

- Hex: **#2D2D2D**
- HSL: **hsl(0, 0%, 18%)**

### 13.5 Muted Background — very light gray

A very light, cool gray used for subtle backgrounds — for example, behind a loading message or a disabled-looking row.

- Hex: approximately **#F1F5F9**
- HSL: **hsl(210, 40%, 96%)**

### 13.6 Muted Foreground — soft slate gray

A soft gray used for secondary, less-important text such as helper text, captions, timestamps, and the small uppercase labels above field values.

- Hex: approximately **#64748B**
- HSL: **hsl(215, 16%, 47%)**

### 13.7 Accent Background — very light beige

A very pale version of the primary brand color, used as a soft accent backdrop behind highlighted items related to the brand action.

- Hex: approximately **#F7F3EF**
- HSL: **hsl(31, 33%, 95%)**

### 13.8 Borders and Input Borders — light gray

The thin border color used around input fields, cards, and separators. Inputs and borders share the same color.

- Hex: approximately **#DDE3EB**
- HSL: **hsl(214, 32%, 91%)**

### 13.9 Destructive / Error Color — red

Used for validation errors (for example, "End time must be after start time"), for error messages, and for any destructive action. It is a clear, readable red.

- Hex: approximately **#E5484D**
- HSL: **hsl(0, 84%, 60%)**
- Text on top of this color should be near-white.

### 13.10 Expense-Specific Accent — sage green

A muted sage/forest green used specifically for the **Add Expense** button and for the "See all expenses" link. It distinguishes the expense action from the time-entry action. (Included for completeness, since the app uses it side-by-side with the time-entry button; the time widget itself does not need it, but it should be available if the widget ever shares a screen with expense actions.)

- Hex: **#548471**

### 13.11 Status Colors

These are the colors used to mark the **sync status** of each entry. Each status uses a soft tinted background, a stronger text color, and a matching thin border. These should be reused exactly so that a worker recognizes the same statuses they already see in the field app.

| Status | Background | Text / Icon | Border |
|---|---|---|---|
| **Open** (clock running, pulsing) | light blue | blue | light blue |
| **Syncing** (in progress, spinner) | light blue | stronger blue | light blue |
| **Synced** (success) | light green | green | light green |
| **Pending** (waiting to send) | light orange | orange | light orange |
| **Failed** (could not send) | light red | red | light red |
| **CRM ID Missing** (sent, but link not recorded) | light amber | amber | amber |
| **Record created** confirmation card | light green tint | dark green / green | green |

In practice the app renders these with the following families, which a developer can match by name:

- Open / Syncing → blue-50 background, blue-600 / blue-700 text, blue-100 / blue-200 border
- Synced → green-50 background, green-600 text, green-100 border
- Pending → orange-50 background, orange-600 text, orange-100 border
- Failed → red-50 background, red-600 text, red-100 border
- CRM ID Missing → amber-50 background, amber-700 text, amber-200 border
- Record created confirmation → green-50/90 background, green-900 / green-800 / green-700 text, green-200 border

### 13.12 Fonts (for visual consistency)

Although this is not a color, it is noted here so the widget matches the rest of the app visually. The app uses two typefaces:

- **Headings** (page titles, section titles, card titles): **Montserrat**, bold.
- **Body text, labels, inputs, buttons**: **Inter**.

### 13.13 Corner Radius

Cards, buttons, and inputs use a soft, slightly rounded corner — about **0.5rem** (8px). This keeps the look friendly and modern without being fully pill-shaped.

### 13.14 How to Use This Palette

When building the widget:

1. Use the **primary beige (#C2A88D)** for the main "Submit Entry" button and for any link or icon that should draw the worker's attention.
2. Use the **dark charcoal (#2D2D2D)** for the top bar of the widget and for section titles, with white text on top.
3. Keep the **background white**, and place content in **white cards with light gray borders (#DDE3EB)**.
4. Use **dark gray (#2D2D2D)** for primary text and **soft slate gray (#64748B)** for secondary/helper text.
5. Use the **red (#E5484D)** only for errors and destructive actions.
6. Use the **status colors** in section 13.11 exactly as listed, so workers recognize the same pending/synced/failed states they already know.
7. Round corners to about **8px**, and use **Montserrat** for titles and **Inter** for everything else.

Following these rules will make the widget feel like a natural part of the Roof Worx field app, even though it lives inside the CRM.

## 14. Summary

In short, the time entry widget for Roof Worx is a small, focused tool that sits inside a CRM job record and lets a field worker record the hours they worked on that job — capturing the job, the date, the start and end times, and a note about the work — with the worker and the total hours handled automatically. The entry is confirmed immediately, sent to the CRM time sheets in the background, and shown back to the worker with a clear status so they always know whether their time made it into the system. Past entries and weekly hours are visible at a glance, while corrections remain a CRM activity to keep one source of truth. The result is faster, more accurate, and less frustrating time capture for the crew, and cleaner labor data for the office.
