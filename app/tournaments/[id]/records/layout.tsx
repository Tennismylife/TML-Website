import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import React from 'react';
import { resolveCanonicalTourneyId } from '@/lib/tournament';

// Helper to extract name (server-side)
function extractName(nameField: any): string {
  if (!nameField) return '';
  if (typeof nameField === 'string') return nameField;
  if (typeof nameField === 'number' || typeof nameField === 'boolean') return String(nameField);
  if (Array.isArray(nameField)) {
    for (const v of nameField) {
      const r = extractName(v);
      if (r) return r;
    }
    return '';
  }
  if (typeof nameField === 'object') {
    for (const v of Object.values(nameField)) {
      const r = extractName(v);
      if (r) return r;
    }
    return '';
  }
  return '';
}
function humanizeName(name: any) {
  const s = String(name || '');
  return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { id: param } = params || {};
  if (!param) return { title: 'Tournament Records | TML' };

  let tournament: any = null;
  if (/^\d+$/.test(param)) {
    const canonicalId = await resolveCanonicalTourneyId(param);
    if (!canonicalId) return { title: 'Tournament Records | TML' };
    const idNum = parseInt(canonicalId, 10);
    tournament = await prisma.tournament.findUnique({ where: { id: idNum }, select: { id: true, name: true, slug: true } });
  } else {
    tournament = await prisma.tournament.findUnique({ where: { slug: param }, select: { id: true, name: true, slug: true } });
  }

  if (!tournament) return { title: 'Tournament Records | TML' };

  // Prefer humanized DB slug for the browser tab when available, fall back to stored name
  const display = tournament.slug
    ? humanizeName(String(tournament.slug).replace(/-/g, ' '))
    : humanizeName(extractName(tournament.name) || `Tournament ${tournament.id}`);

  return {
    title: `${display} - Records | TML`,
  };
}

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  // layout just renders children; metadata is handled by generateMetadata
  return <>{children}</>;
}
