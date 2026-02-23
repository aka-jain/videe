'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ModalConfig {
  id: string;
  title?: string;
  content: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  onClose?: () => void;
}

interface ModalContextType {
  isOpen: boolean;
  currentModal: ModalConfig | null;
  openModal: (config: ModalConfig) => void;
  closeModal: () => void;
  closeModalById: (id: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentModal, setCurrentModal] = useState<ModalConfig | null>(null);

  const openModal = (config: ModalConfig) => {
    setCurrentModal(config);
    setIsOpen(true);
  };

  const closeModal = () => {
    if (currentModal?.onClose) {
      currentModal.onClose();
    }
    setIsOpen(false);
    setCurrentModal(null);
  };

  const closeModalById = (id: string) => {
    if (currentModal?.id === id) {
      closeModal();
    }
  };

  const value = {
    isOpen,
    currentModal,
    openModal,
    closeModal,
    closeModalById,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}; 