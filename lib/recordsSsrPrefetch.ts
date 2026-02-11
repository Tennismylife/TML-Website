export function isRecordsSsrPrefetchEnabled() {
  // Default to enabled unless explicitly disabled with RECORDS_SSR_PREFETCH=0
  // This ensures server-side prefetching of records data for better SEO and
  // that table data is present in the initial HTML unless you intentionally
  // opt-out in environments where SSR prefetch is undesirable.
  return process.env.RECORDS_SSR_PREFETCH !== '0';
}
