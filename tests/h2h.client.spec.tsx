import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import H2HClient from '@/app/h2h/H2HClient';

describe('H2HClient heading', () => {
  it('does not render H1 in client', () => {
    render(<H2HClient initialPlayer1={{ id: '1', atpname: 'Ekaterina Alexandrova', slug: 'ekaterina-alexandrova' }} initialPlayer2={{ id: '2', atpname: 'Jelena Ostapenko', slug: 'jelena-ostapenko' }} initialMatches={[]} initialOpponents={[]} />);

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('does not render H1 even if players swapped', () => {
    render(<H2HClient initialPlayer1={{ id: '2', atpname: 'Jelena Ostapenko', slug: 'jelena-ostapenko' }} initialPlayer2={{ id: '1', atpname: 'Ekaterina Alexandrova', slug: 'ekaterina-alexandrova' }} initialMatches={[]} initialOpponents={[]} />);

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });
});