import React from 'react';
import type { Metadata } from 'next';
import SurfacePageContent, { generateSurfaceMetadata } from '../surfacePageFactory';

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { id } = await params;
  return generateSurfaceMetadata(id, 'Hard');
}

export default async function HardPage({ params }: any) {
  const { id } = await params;
  return <SurfacePageContent id={id} surface="Hard" />;
}
