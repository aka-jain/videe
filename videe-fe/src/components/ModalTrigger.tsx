'use client';

import React, { ReactNode } from 'react';
import { useModal, ModalConfig } from '../contexts/ModalContext';

interface ModalTriggerProps {
  children: ReactNode;
  modalConfig: ModalConfig;
  className?: string;
  disabled?: boolean;
}

const ModalTrigger: React.FC<ModalTriggerProps> = ({
  children,
  modalConfig,
  className = '',
  disabled = false,
}) => {
  const { openModal } = useModal();

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    openModal(modalConfig);
  };

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!disabled) {
            openModal(modalConfig);
          }
        }
      }}
    >
      {children}
    </div>
  );
};

export default ModalTrigger; 