export const ZOHO =
  typeof window !== "undefined" ? window.ZOHO : undefined;

export const isZohoReady = () =>
  typeof ZOHO !== "undefined" && !!ZOHO?.embeddedApp?.init;

export async function safe(fn, fallback) {
  if (!isZohoReady()) return fallback;
  try {
    return await fn();
  } catch (err) {
    console.error("[zohoClient]", err);
    return fallback;
  }
}

export async function initZoho(onPageLoad) {
  if (!isZohoReady()) {
    console.warn("Running outside Zoho — SDK not present.");
    return false;
  }

  ZOHO.embeddedApp.on("PageLoad", onPageLoad);
  await ZOHO.embeddedApp.init();
  return true;
}

export async function resizeWidget(height = "100%", width = "100%") {
  return safe(
    () => ZOHO.CRM.UI.Resize({ height, width }),
    null
  );
}

export async function closePopupReload() {
  return safe(
    () => ZOHO.CRM.UI.Popup.closeReload(),
    null
  );
}

export async function getCurrentUser() {
  return safe(async () => {
    const res = await ZOHO.CRM.CONFIG.getCurrentUser();
    return res?.users?.[0] ?? res ?? null;
  }, null);
}

export async function getRecord({ entity, recordId }) {
  if (!isZohoReady()) throw new Error("Zoho SDK not ready");
  return ZOHO.CRM.API.getRecord({ Entity: entity, RecordID: recordId });
}

export async function insertRecord({ entity, data, trigger }) {
  if (!isZohoReady()) throw new Error("Zoho SDK not ready");
  return ZOHO.CRM.API.insertRecord({
    Entity: entity,
    APIData: data,
    Trigger: trigger ?? ["workflow"],
  });
}

export async function updateRecord({ entity, recordId, data, trigger }) {
  if (!isZohoReady()) throw new Error("Zoho SDK not ready");
  return ZOHO.CRM.API.updateRecord({
    Entity: entity,
    RecordID: recordId,
    APIData: { ...data, id: recordId },
    Trigger: trigger ?? ["workflow"],
  });
}

export async function deleteRecord({ entity, recordId }) {
  if (!isZohoReady()) throw new Error("Zoho SDK not ready");
  return ZOHO.CRM.API.deleteRecord({
    Entity: entity,
    RecordID: recordId,
  });
}

export async function searchRecords({
  entity,
  type = "criteria",
  query,
  searchValue,
  perPage = 200,
  page = 1,
}) {
  if (!isZohoReady()) throw new Error("Zoho SDK not ready");
  const params = {
    Entity: entity,
    Type: type,
    per_page: perPage,
    page,
  };
  if (type === "criteria") {
    params.Query = query;
  } else {
    params.SearchValue = searchValue;
  }
  return ZOHO.CRM.API.searchRecord(params);
}

export async function getRelatedRecords({ entity, recordId, relatedList }) {
  if (!isZohoReady()) throw new Error("Zoho SDK not ready");
  return ZOHO.CRM.API.getRelatedRecords({
    Entity: entity,
    RecordID: recordId,
    RelatedList: relatedList,
  });
}

/**
 * Normalize Zoho search/get responses — shape varies by query type.
 */
export function normalizeRecords(response) {
  if (!response) return [];
  if (Array.isArray(response.data)) return response.data;
  const nested = response?.details?.statusMessage?.data;
  if (Array.isArray(nested)) return nested;
  if (Array.isArray(response?.users)) return response.users;
  return [];
}

export function isSuccessResponse(response) {
  const item = response?.data?.[0];
  return item?.code === "SUCCESS" || item?.status === "success";
}

export function getResponseId(response) {
  return response?.data?.[0]?.details?.id ?? null;
}

export function getResponseError(response) {
  return (
    response?.data?.[0]?.message ??
    response?.message ??
    "Unknown error"
  );
}
