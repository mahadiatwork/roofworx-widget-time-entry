/**
 * Zoho CRM module and field API name mapping.
 *
 * IMPORTANT: Adjust every value below to match your Roof Worx Zoho org.
 * The widget reads/writes exclusively through these names.
 */

export const zohoSchema = {
  /** API name of the custom Time Entry module */
  timeEntryModule: "Time_Sheets",
  /** Browser tab path used by Zoho CRM record URLs for Time Sheets */
  timeEntryTab: "CustomModule3",

  /** API name of the module where this widget is opened */
  portalUserModule: "Portal_Users",

  /** API name of the Jobs / Deals module */
  jobsModule: "Deals",

  /** Time Entry field API names */
  timeEntryFields: {
    /** Required record name field on Time Sheets */
    name: "Name",
    /** Lookup to the job record */
    job: "Project",
    /** Date field (date type) */
    date: "Time_Entry_Date",
    /** Start time (text or datetime — adjust to your org) */
    startTime: "Start_Time",
    /** End time */
    endTime: "End_Time",
    /** Optional notes */
    notes: "Task_Note",
    /** Lookup or owner field for the worker */
    worker: "Contractor",
    /** Decimal/number — calculated by widget, stored in CRM */
    totalHours: "Total_Hours",
    /**
     * Checkbox — when true, Zoho workflow fires Deluge → Supabase sync.
     * MUST match the checkbox field you create in the Time Entry module.
     */
    createdByWidget: "Created_By_Widget",
    /**
     * Picklist or text: "open" | "closed"
     * Used for the one-running-clock-per-worker rule.
     */
    status: "Status",
    /**
     * Optional picklist for sync tracking in CRM (if your org has it).
     * Values: pending | syncing | synced | failed | crm_id_missing
     */
    syncStatus: "Sync_Status",
    /** Display name of the job (denormalized, if your module has it) */
    jobName: "Job_Name",
    /** Optional lookup to the opened portal user/module record */
    portalUser: null,
  },

  /** Opened portal user/module record field API names */
  portalUserFields: {
    /** Field to show in the widget header; supports plain text or lookup object */
    displayName: "Name",
  },

  /** Jobs / Deals field API names */
  jobsFields: {
    name: "Deal_Name",
    proposalNumber: "Proposal_Number",
    street: "Street",
    city: "City",
    /** Stage or status picklist — used to filter closed-lost jobs */
    stage: "Stage",
    /**
     * Multi-select user lookup or related list field for crew assignment.
     * If assignments are via a linking module, set useLinkingModule: true below.
     */
    assignedWorkers: "Assigned_Workers",
    /** Address display field (if you have a formula/combined field) */
    displayAddress: "Display_Address",
  },

  /**
   * How to match the signed-in CRM user to a worker on time entries.
   * "id" — compare ZOHO.CRM.CONFIG.getCurrentUser().id to worker field
   * "email" — compare email to worker email field
   */
  currentUserMatch: "id",

  /** Worker email field on Users (only needed if currentUserMatch === "email") */
  workerEmailField: "Email",

  /** Stage values that should appear in the job picker for new entries */
  includedStages: [
    "Estimate Requested",
    "Proposal Sent",
    "Closed Won",
    "Job Checklist",
    "Job Scheduled",
    "Completed",
    "Invoiced",
  ],

  /** Stage values that should NOT appear if includedStages is empty */
  excludedStages: ["Closed Lost", "Closed-Lost", "Closed Lost - No Bid"],

  /** Default start time shown in the form (24h "HH:MM") */
  defaultStartTime: "07:00",

  /** How many days of history to show */
  historyDays: 30,

  /** Widget placement — used for PageLoad context validation */
  expectedJobModule: "Portal_Users",

  /** Related list API name for the opened module record; fill in when known */
  relatedList: {
    apiName: "Time_Sheets",
  },

  /**
   * If crew assignments live in a linking module instead of a lookup on Deals,
   * configure it here. Leave null to use assignedWorkers on the job record.
   */
  linkingModule: null,
  // linkingModule: {
  //   module: "Crew_Assignments",
  //   jobField: "Job",
  //   workerField: "Worker",
  // },
};

export default zohoSchema;
