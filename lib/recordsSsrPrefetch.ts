export function isRecordsSsrPrefetchEnabled() {
  return process.env.RECORDS_SSR_PREFETCH === '1';
}
