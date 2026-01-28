import React from 'react';
import { render, waitFor } from '@testing-library/react';
import AgesFullClient from '@/app/tournaments/[id]/records/ages/_components/AgesFullClient';

describe('AgesFullClient mounting', () => {
  it('mounts into fallback without throwing synchronous unmount errors', async () => {
    // setup: create fallback container as server would
    const id = 'test';
    const section = 'main';
    const which = 'youngest';
    const elId = `ages-full-static-${section}-${encodeURIComponent(String(which))}`;

    const fallback = document.createElement('div');
    fallback.id = elId;
    fallback.innerHTML = `<div class="test-fallback"><h3>Heading</h3><div class="table">table</div></div>`;
    document.body.appendChild(fallback);

    // render AgesFullClient which mounts into the fallback asynchronously
    const { unmount } = render(<AgesFullClient id={id} section={section} which={which as any} initialRows={[]} />);

    // wait a tick for the setTimeout(0) mount to run
    await waitFor(() => {
      // After mount the fallback should still be in the document, and no errors should have been thrown (test would fail if it crashed)
      expect(document.getElementById(elId)).toBeTruthy();
    });

    // cleanup
    unmount();
    document.body.removeChild(fallback);
  });
});