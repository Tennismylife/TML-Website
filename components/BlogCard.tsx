"use client";
import Link from 'next/link';

export default function BlogCard({ slug, title, date, summary, thumbnail }: { slug: string; title: string; date?: string | null; summary?: string; thumbnail?: string | null }) {
  const thumbPng = thumbnail ?? `/blog/thumbs/${slug}.png`;
  const thumbSvg = `/blog/thumbs/${slug}.svg`;
  return (
    <article className="border border-white/10 rounded p-4 bg-gray-900 flex gap-4 items-start">
      <div className="w-32 h-20 flex-shrink-0 overflow-hidden rounded">
        <img src={thumbPng} alt={`Thumbnail for ${title}`} onError={(e:any)=>{ try{ e.target.onerror=null; e.target.src=thumbSvg }catch{} }} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-white mb-1">
          <Link href={`/blog/${slug}`} className="text-indigo-300 hover:underline">{title}</Link>
        </h3>
        {date && <div className="text-sm text-gray-400 mb-2">{date}</div>}
        <p className="text-gray-300">{summary}</p>
      </div>
    </article>
  );
}
