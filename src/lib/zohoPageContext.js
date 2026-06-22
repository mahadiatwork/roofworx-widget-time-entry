/**
 * Extract context from the Zoho PageLoad payload.
 */

export function getRecordId(pageLoadData) {
  if (!pageLoadData) return null;
  return (
    pageLoadData.EntityId ||
    pageLoadData.RecordId ||
    pageLoadData?.Entity?.[0]?.id ||
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
