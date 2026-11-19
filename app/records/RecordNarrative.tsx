import { ReactNode } from 'react';
import AtpRecordCommentary from './AtpRecordCommentary';

interface RecordNarrativeProps {
  children: ReactNode;
  className?: string;
  recordPath?: string;
}

export default function RecordNarrative({ children, className = '', recordPath }: RecordNarrativeProps) {
  return (
    <AtpRecordCommentary
      recordPath={recordPath}
      className={
        'mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200' +
        (className ? ` ${className}` : '')
      }
    >
      {children}
    </AtpRecordCommentary>
  );
}
