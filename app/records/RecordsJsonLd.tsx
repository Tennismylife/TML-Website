import React from 'react';

export type RecordsItemListEntry = {
  name: string;
  url: string;
};

function dedupeEntries(items: RecordsItemListEntry[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name}::${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function RecordsItemListJsonLd({
  items,
  name = 'Tennis Records',
  description,
}: {
  items: RecordsItemListEntry[];
  name?: string;
  description?: string;
}) {
  const uniqueItems = dedupeEntries(items);

  if (!uniqueItems.length) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    ...(description ? { description } : {}),
    itemListElement: uniqueItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
