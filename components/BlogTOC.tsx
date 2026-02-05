export default function BlogTOC({ toc }: { toc: Array<{ id: string; text: string; level: number }> }) {
  if (!toc || toc.length === 0) return null;
  return (
    <nav className="mb-6">
      <div className="text-sm text-gray-400 mb-2">Contents</div>
      <ul className="space-y-1">
        {toc.map(h => (
          <li key={h.id} className={`ml-${(h.level-1)*4}`}>
            <a href={`#${h.id}`} className="text-gray-300 hover:text-indigo-300">{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
