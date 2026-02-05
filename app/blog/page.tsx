import { getAllPosts } from '@/lib/blog';
import BlogCard from '@/components/BlogCard';

const METADATA_BASE = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? (process.env.NODE_ENV === 'production' ? 'https://stats.tennismylife.org' : 'http://localhost:3000');

export const metadata = {
  title: 'Blog',
  description: 'Articles and analysis about tennis statistics and performance.',
  openGraph: {
    title: 'Blog - TennisMyLife',
    description: 'Articles and analysis about tennis statistics and performance.',
    url: new URL('/blog', METADATA_BASE).toString(),
    type: 'website',
    images: [{ url: new URL('/og/site-preview.png', METADATA_BASE).toString(), width: 1200, height: 630, alt: 'Blog - TennisMyLife' }]
  },
  twitter: { card: 'summary_large_image', images: [new URL('/og/site-preview.png', METADATA_BASE).toString()] },
  alternates: { canonical: '/blog' }
};

export default async function BlogPage() {
  const posts = await getAllPosts();
  return (
    <main className="w-full px-4 sm:px-6">
      <h1 className="text-2xl font-bold text-white mb-4">Blog</h1>
      <p className="text-gray-300 mb-6">Articles and commentary on tennis statistics.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts.map(p => (
          <BlogCard key={p.slug} slug={p.slug} title={p.title} date={p.date} summary={p.summary} thumbnail={p.thumbnail} />
        ))}
      </div>
    </main>
  );
}
