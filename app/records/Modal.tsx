"use client";

import React from "react";

interface ModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ show, onClose, title, children }) => {
  if (!show) return null;

  // Chiudi con ESC
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 text-gray-200 p-4 w-full max-w-7xl max-h-screen overflow-y-auto rounded border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
        {children}
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
