import { getPostBySlug } from '@/lib/blog';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const posts = await (await import('@/lib/blog')).getAllPosts();
  return posts.map(p => ({ slug: p.slug }));
}

export const dynamic = 'force-dynamic';

import MDXClient from '@/components/MDXContent';

export async function generateMetadata({ params }: { params: any }) {
  try {
    // params might be a Promise in some contexts; await if so
    const resolvedParams = params && typeof params.then === 'function' ? await params : params;
    const slug = resolvedParams?.slug;
    if (!slug) return { title: 'Blog — Tennis My Life' } as any;
    const { getPostBySlug } = await import('@/lib/blog');
    const post = await getPostBySlug(slug);

    const METADATA_BASE = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://stats.tennismylife.org';
    const imageUrl = post?.thumbnail ? (post.thumbnail.startsWith('/') ? new URL(post.thumbnail, METADATA_BASE).toString() : post.thumbnail) : new URL('/og/site-preview.png', METADATA_BASE).toString();

    const description = post?.ogDescription ?? post?.summary ?? '';
    const ogTitle = post?.ogTitle ?? post?.title ?? 'Blog — Tennis My Life';
    const ogType = post?.ogType ?? 'article';

    return {
      title: post?.title ?? 'Blog — Tennis My Life',
      description,
      openGraph: {
        title: ogTitle,
        description,
        type: ogType,
        url: new URL(`/blog/${slug}`, METADATA_BASE).toString(),
        images: [{ url: imageUrl, width: 1200, height: 630, alt: post?.title ?? ogTitle }]
      },
      twitter: { card: 'summary_large_image', images: [imageUrl] }
    } as any;
  } catch (e) {
    try { console.error('generateMetadata error for slug', params && (params.slug || params), e && (e.stack || e.message || e)); } catch (_) {}
    return { title: 'Blog — Tennis My Life' } as any;
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await params;
  const post = await getPostBySlug(p.slug);
  if (!post) return notFound();
  // debug: log showToc and toc info
  try { console.log('debug: post.showToc=', post.showToc, 'tocLength=', post.toc ? post.toc.length : 0); } catch(e) {}

  return (
    <main className="max-w-5xl mx-auto px-6 sm:px-8">
      <article className="mx-auto">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-white mb-3 text-left">{post.title}</h1>
        </div>
        {post.date && <div className="text-sm text-gray-400 mb-2">{post.date} — {post.author} — <span className="ml-2 font-medium">{post.readingTime?.minutes} min read</span></div>}
        {/* Table of Contents removed by policy */}
        {post.contentHtml ? (
          <div className="prose prose-lg prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
        ) : post.mdxSource ? (
          // `MDXContent` is a client component that renders serialized MDX
          // Render client MDX content when we don't have server HTML
          <div style={{ marginTop: '0.5rem' }} className="prose prose-lg prose-invert max-w-none">
            {/* @ts-ignore */}
            <MDXClient source={post.mdxSource} />
          </div>
        ) : null}
      </article>

      {/* Structured data (JSON-LD) for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              "@id": `https://stats.tennismylife.org/blog/${post.slug}`,
              "headline": post.title,
              "description": post.summary || "",
              "image": `https://stats.tennismylife.org/blog/img/alcaraz-ao-2026-800.webp`,
              "datePublished": post.date || undefined,
              "dateModified": post.date || undefined,
              "author": {
                "@type": "Organization",
                "name": post.author || "TML Editorial"
              },
              "publisher": {
                "@type": "Organization",
                "name": "TennisMyLife",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://stats.tennismylife.org/logo.png"
                }
              },
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://stats.tennismylife.org/blog/${post.slug}`
              },
              "about": [
                { "@type": "Person", "name": "Carlos Alcaraz" },
                { "@type": "SportsEvent", "name": "Australian Open 2026 Final" }
              ]
            },
            {
              "@type": "SportsEvent",
              "name": "Australian Open 2026 – Men's Final",
              "startDate": "2026-02-02",
              "eventStatus": "https://schema.org/EventCompleted",
              "sport": "Tennis",
              "location": {
                "@type": "Place",
                "name": "Rod Laver Arena",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "Melbourne",
                  "addressCountry": "AU"
                }
              },
              "competitor": [
                { "@type": "Person", "name": "Carlos Alcaraz" },
                { "@type": "Person", "name": "Novak Djokovic" }
              ],
              "winner": { "@type": "Person", "name": "Carlos Alcaraz" }
            },
            {
              "@type": "Person",
              "@id": "https://stats.tennismylife.org/players/carlos-alcaraz",
              "name": "Carlos Alcaraz",
              "birthDate": "2003-05-05",
              "nationality": "Spanish",
              "jobTitle": "Professional Tennis Player"
            }
          ]
        }) }}
      />

      {/* FAQ structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Who won the Australian Open 2026 men's final?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Carlos Alcaraz won the 2026 Australian Open men's final, defeating Novak Djokovic in four sets."
              }
            },
            {
              "@type": "Question",
              "name": "What was the score of the Australian Open 2026 final?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Carlos Alcaraz defeated Novak Djokovic with a score of 2–6, 6–2, 6–3, 7–5 in the 2026 Australian Open final."
              }
            },
            {
              "@type": "Question",
              "name": "How old was Carlos Alcaraz when he won the Australian Open 2026?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Carlos Alcaraz was 22 years and 272 days old when he won the 2026 Australian Open."
              }
            },
            {
              "@type": "Question",
              "name": "Did Carlos Alcaraz complete a Career Grand Slam?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. By winning the 2026 Australian Open, Carlos Alcaraz completed a Career Grand Slam, becoming the youngest man in history to achieve this feat."
              }
            },
            {
              "@type": "Question",
              "name": "How many Grand Slam titles has Carlos Alcaraz won?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "As of the 2026 Australian Open, Carlos Alcaraz has won 7 Grand Slam singles titles."
              }
            },
            {
              "@type": "Question",
              "name": "Is Carlos Alcaraz the youngest Career Grand Slam winner?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. At 22 years and 272 days, Carlos Alcaraz is the youngest male player in tennis history to complete a Career Grand Slam."
              }
            },
            {
              "@type": "Question",
              "name": "How many Grand Slam finals has Alcaraz won?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Carlos Alcaraz has won 7 of his first 8 Grand Slam finals, a record previously matched only by legends such as Roger Federer."
              }
            }
          ]
        }) }}
      />

      {/* Breadcrumb structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://stats.tennismylife.org" },
            { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://stats.tennismylife.org/blog" },
            { "@type": "ListItem", "position": 3, "name": post.title, "item": `https://stats.tennismylife.org/blog/${post.slug}` }
          ]
        }) }}
      />

      {post.structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: post.structuredData,
          }}
        />
      )}
    </main>
  );
}
