import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import RelatedRecordsLinks from '../../app/records/RelatedRecordsLinks';

describe('RelatedRecordsLinks', () => {
  it('does not propagate bestOf to destinations where the filter is invalid', () => {
    const html = renderToStaticMarkup(
      <RelatedRecordsLinks
        currentTab="played"
        currentSub={null}
        filters={{ bestOf: 1 }}
      />,
    );

    expect(html).not.toContain('/records/roundsonentries/round?bestOf=1');
    expect(html).toContain('/records/roundsonentries/round');
    expect(html).toContain('/records/percentage?bestOf=1');
  });
});