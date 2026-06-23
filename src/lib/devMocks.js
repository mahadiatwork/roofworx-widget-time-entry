/**
 * Mock data for standalone dev mode (no Zoho SDK).
 */

export const mockCurrentUser = {
  id: "5865240000024572011",
  email: "dev@roofworxext.com",
  full_name: "Dev Worker",
};

export const mockJobs = [
  {
    id: "5865240000024572057",
    name: "RoofWorx - Office-630 Bonnie Lane-261369",
    street: "630 Bonnie Lane",
    city: "Elk Grove Village",
    stage: "In Progress",
    displayLabel: "630 Bonnie Lane, Elk Grove Village — RoofWorx Office",
  },
  {
    id: "5865240000026847005",
    name: "Lenza Residence-13130 Meadowview Ln-261481",
    street: "13130 Meadowview Ln",
    city: "Homer Glen",
    stage: "Estimate Requested",
    displayLabel: "13130 Meadowview Ln, Homer Glen — Lenza Residence",
  },
  {
    id: "5865240000026839007",
    name: "Cochera Residence-3607 S 59th Ave-261480",
    street: "3607 S 59th Ave",
    city: "Cicero",
    stage: "In Progress",
    displayLabel: "3607 S 59th Ave, Cicero — Cochera Residence",
  },
];

export const mockHistory = [
  {
    id: "mock-entry-1",
    jobId: "5865240000024572057",
    jobName: "RoofWorx - Office-630 Bonnie Lane-261369",
    date: "2026-06-19",
    startTime: "07:00",
    endTime: "17:00",
    totalHours: "10",
    notes: "Tear-off and dry-in",
    status: "closed",
    syncStatus: "synced",
    crmId: "5865240000026820014",
  },
  {
    id: "mock-entry-2",
    jobId: "5865240000024572057",
    jobName: "RoofWorx - Office-630 Bonnie Lane-261369",
    date: "2026-06-18",
    startTime: "07:00",
    endTime: "15:30",
    totalHours: "8.5",
    notes: "",
    status: "closed",
    syncStatus: "pending",
    crmId: "5865240000026823014",
  },
];

export const mockPageLoad = {
  Entity: "Portal_Users",
  EntityId: "5865240000024572011",
};

export const mockOpenedRecord = {
  id: "5865240000024572011",
  Name: "Dev Worker",
};
