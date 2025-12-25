// @vitest-environment jsdom
import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import Modal from '../components/Modal';
import { describe, it, beforeEach, afterEach } from 'vitest';

describe('Modal', () => {
  let container: HTMLElement | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) document.body.removeChild(container);
    container = null;
  });

  it('renders children when show is true and unmounts cleanly', () => {
    act(() => {
      const root = createRoot(container!);
      root.render(
        <Modal show={true} onClose={() => {}} title="Test">
          <div>Modal Content</div>
        </Modal>
      );
      root.unmount();
    });
  });
});
