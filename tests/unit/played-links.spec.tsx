import { render, screen } from '@testing-library/react';
import Played from '@/app/records/played/played';

describe('Played links', () => {
  it('uses slug for player matches link when slug is available', () => {
    const topPlayed = [
      { id: '123', slug: 'qins', name: 'John Qins', ioc: 'QIN', totalPlayed: 42 },
    ];

    render(<Played topPlayed={topPlayed} fetchEnabled={false} />);

    // the matches link shows the totalPlayed as link text
    const matchesLink = screen.getByRole('link', { name: '42' }) as HTMLAnchorElement;
    expect(matchesLink).toBeTruthy();
    expect(matchesLink.getAttribute('href') || '').toContain('/players/qins/matches');
    expect(matchesLink.getAttribute('href') || '').toContain('result=Played');
  });
});