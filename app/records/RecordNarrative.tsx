import { ReactNode } from 'react';

interface RecordNarrativeProps {
  children: ReactNode;
  className?: string;
}

export default function RecordNarrative({ children, className = '' }: RecordNarrativeProps) {
  return (
    <div
      className={
        'mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200' +
        (className ? ` ${className}` : '')
      }
    >
      {children}
    </div>
  );
}
