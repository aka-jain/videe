import React from 'react';
import { useModal, ModalConfig } from '../contexts/ModalContext';

export const useModalHelpers = () => {
  const { openModal, closeModal } = useModal();

  const showConfirmModal = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    const modalConfig: ModalConfig = {
      id: 'confirm-modal',
      title,
      content: React.createElement('div', { className: 'space-y-4' },
        React.createElement('p', { className: 'text-zinc-300' }, message),
        React.createElement('div', { className: 'flex justify-end space-x-3' },
          React.createElement('button', {
            onClick: () => {
              closeModal();
              onCancel?.();
            },
            className: 'px-4 py-2 text-zinc-400 hover:text-white transition-colors'
          }, 'Cancel'),
          React.createElement('button', {
            onClick: () => {
              closeModal();
              onConfirm();
            },
            className: 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors'
          }, 'Confirm')
        )
      ),
      size: 'sm',
      closeOnOverlayClick: false,
    };

    openModal(modalConfig);
  };

  const showAlertModal = (
    title: string,
    message: string,
    onClose?: () => void
  ) => {
    const modalConfig: ModalConfig = {
      id: 'alert-modal',
      title,
      content: React.createElement('div', { className: 'space-y-4' },
        React.createElement('p', { className: 'text-zinc-300' }, message),
        React.createElement('div', { className: 'flex justify-end' },
          React.createElement('button', {
            onClick: () => {
              closeModal();
              onClose?.();
            },
            className: 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors'
          }, 'OK')
        )
      ),
      size: 'sm',
      closeOnOverlayClick: false,
    };

    openModal(modalConfig);
  };

  const showCustomModal = (config: ModalConfig) => {
    openModal(config);
  };

  return {
    showConfirmModal,
    showAlertModal,
    showCustomModal,
    closeModal,
  };
}; 