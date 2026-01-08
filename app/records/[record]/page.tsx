import RecordPage from '../page';

// Reuse the main records page for per-record paths so direct navigation to
// /records/<record> renders the same UI and avoids server-only redirects.
export default function RecordSubPage() {
  return <RecordPage />;
}
