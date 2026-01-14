import dynamic from 'next/dynamic';

const TitlesClient = dynamic(() => import('./TitlesClient'), { ssr: false });

export default function Page({ params }: any) {
  const { id } = params;
  // Render a client-only wrapper to ensure the Titles view is client-rendered (like Ages main)
  return <TitlesClient id={id} />;
}
