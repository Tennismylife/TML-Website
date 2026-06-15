import React from 'react';

export type RecordsFaqEntry = {
  question: string;
  answer: string;
};

function dedupeFaq(items: RecordsFaqEntry[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.question}::${item.answer}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function RecordsFaqJsonLd({
  items,
}: {
  items: RecordsFaqEntry[];
}) {
  const uniqueItems = dedupeFaq(items);
  if (!uniqueItems.length) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: uniqueItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
