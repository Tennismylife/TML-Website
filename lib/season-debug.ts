export let lastSeasonDebug: any = null;

export function setLastSeasonDebug(obj: any) {
  try { lastSeasonDebug = { ...obj, _ts: new Date().toISOString() }; } catch (e) { lastSeasonDebug = { _ts: new Date().toISOString(), raw: String(obj) }; }
}

export function getLastSeasonDebug() {
  return lastSeasonDebug;
}

export function clearLastSeasonDebug() {
  lastSeasonDebug = null;
}
