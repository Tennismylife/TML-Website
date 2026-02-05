"use client";
import React from 'react';
import { MDXRemote } from 'next-mdx-remote';
import dynamic from 'next/dynamic';

// Import MDX components (Chart is client-side)
import Callout from './mdx/Callout';
const Chart = dynamic(() => import('./mdx/Chart'), { ssr: false });

const components: Record<string, any> = {
  Callout,
  Chart,
  // allow html elements to have Tailwind classes through MDX
  img: (props: any) => <img {...props} className={`rounded`} />,
};

export default function MDXContent({ source }: { source: any }) {
  // `MDXRemote` from next-mdx-remote/rsc supports server-rendered serialized MDX
  return (
    <div className="prose prose-invert max-w-none">
      {/* @ts-ignore */}
      <MDXRemote {...(source as MDXRemoteProps)} components={components} />
    </div>
  );
}
