import React from 'react';
import type { Metadata } from 'next';
import SurfacePageContent, { generateSurfaceMetadata } from '../surfacePageFactory';

export const revalidate = 86400; // 24 h — surface stats are stable; avoids Googlebot 499 timeouts

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { id } = await params;
  return generateSurfaceMetadata(id, 'Grass');
}

export default async function GrassPage({ params }: any) {
  const { id } = await params;
  return <SurfacePageContent id={id} surface="Grass" />;
}
