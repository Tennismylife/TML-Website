import CountModalOutlet from '@/components/CountModalOutlet';

export default async function CountLayout({ children, params }: { children?: React.ReactNode; params: Promise<{ id: string }> }) {
  const p = await params
  const modal = (arguments[0] as any).modal

  return (
    <div className="relative">
      <div>{children}</div>

      {/* server-injected modal (rendered into 'modal' slot by Next when using intercepted routes)
          Wrap it in a full-screen overlay so injected content appears as an overlay as well */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 md:pt-20">
          <div className="absolute inset-0 bg-black/40" />

          <div className="relative z-10 w-full max-w-3xl flex items-start">
            <div className="absolute top-4 right-4 z-20">
              <button id="server-modal-close" onClick={() => { if (typeof window !== 'undefined') window.history.back(); }} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white">Close</button>
            </div>

            <div id="server-modal" className="server-modal-content bg-gray-900/95 rounded-2xl w-full max-h-[calc(100vh-120px)] overflow-auto p-6">
              {modal}
            </div>
          </div>

          {/* client helper to adjust scroll/focus when server modal content arrives */}
          {/* @ts-ignore - client component */}
          <script suppressHydrationWarning={true} dangerouslySetInnerHTML={{ __html: `(${String(function() {})})();` }} />
        </div>
      )}
    </div>
  );
}
