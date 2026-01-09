import type { ReactNode } from 'react';
import ModalClient from './ModalClient';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  showCloseButton?: boolean;
  show?: boolean;
}

export default function Modal({
  title,
  children,
  onClose,
  showCloseButton = true,
  show = true,
}: ModalProps) {
  // Server component: render nothing on server when hidden
  if (!show) return null;

  // Delegate interactivity to a client component
  return (
    <ModalClient title={title} onClose={onClose} showCloseButton={showCloseButton}>
      {children}
    </ModalClient>
  );
}
