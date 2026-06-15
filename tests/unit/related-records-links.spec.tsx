import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import RelatedRecordsLinks from '../../app/records/RelatedRecordsLinks';

describe('RelatedRecordsLinks', () => {
  it('keeps related links canonical and does not append bestOf query params', () => {
    const html = renderToStaticMarkup(
      <RelatedRecordsLinks
        currentTab="played"
        currentSub={null}
        filters={{ bestOf: 1 }}
      />,
    );

    expect(html).not.toContain('?bestOf=1');
    expect(html).toContain('/records/most-matches-played');
  });
});
