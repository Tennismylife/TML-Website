export function isRecordsSsrPrefetchEnabled() {
  // Keep records SSR prefetch always on so the initial HTML includes
  // narrative and table data for crawlers and no-JS clients.
  return true;
}
