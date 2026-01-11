'use client';

import useTrackPageView from '../lib/hooks/useTrackPageView';

export default function TrackPageClient() {
  useTrackPageView();
  return null;
}
