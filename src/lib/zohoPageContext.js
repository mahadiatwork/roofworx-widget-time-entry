/**
 * Extract context from the Zoho PageLoad payload.
 */

export function getRecordId(pageLoadData) {
  if (!pageLoadData) return null;
  const entityRecord = Array.isArray(pageLoadData.Entity)
    ? pageLoadData.Entity[0]
    : null;
  const firstId = (value) => {
    if (Array.isArray(value)) return value[0]?.id ?? value[0] ?? null;
    if (value && typeof value === "object") return value.id ?? null;
    return value ?? null;
  };

  return (
    firstId(pageLoadData.EntityId) ||
    firstId(pageLoadData.RecordId) ||
    firstId(entityRecord) ||
    null
  );
}

export function getModuleName(pageLoadData) {
  if (!pageLoadData) return null;
  return pageLoadData?.Entity || pageLoadData?.Module || null;
}

export function isJobRecordContext(pageLoadData, expectedModule) {
  const module = getModuleName(pageLoadData);
  const recordId = getRecordId(pageLoadData);
  if (!recordId) return false;
  if (!expectedModule) return true;
  return module === expectedModule;
}
