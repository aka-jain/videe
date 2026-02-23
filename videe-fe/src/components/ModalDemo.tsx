'use client';

import React from 'react';
import { ModalProvider } from '../contexts/ModalContext';
import { useModalHelpers } from '../hooks/useModalHelpers';
import Modal from './Modal';
import ModalTrigger from './ModalTrigger';
import Button from './Button';

const ModalDemoContent: React.FC = () => {
  const { showConfirmModal, showAlertModal, showCustomModal } = useModalHelpers();

  const handleShowConfirm = () => {
    showConfirmModal(
      'Delete Video',
      'Are you sure you want to delete this video? This action cannot be undone.',
      () => {
        console.log('Confirmed deletion');
        // Handle deletion logic here
      },
      () => {
        console.log('Cancelled deletion');
      }
    );
  };

  const handleShowAlert = () => {
    showAlertModal(
      'Success!',
      'Your video has been successfully generated and is ready for download.',
      () => {
        console.log('Alert closed');
      }
    );
  };

  const handleShowCustomModal = () => {
    showCustomModal({
      id: 'custom-modal',
      title: 'Custom Modal',
      size: 'lg',
      content: (
        <div className="space-y-4">
          <p className="text-zinc-300">
            This is a custom modal with custom content. You can put any React components here.
          </p>
          <div className="bg-zinc-800 p-4 rounded">
            <h3 className="text-white font-medium mb-2">Example Form</h3>
            <input
              type="text"
              placeholder="Enter your name"
              className="w-full p-2 bg-zinc-700 border border-zinc-600 rounded text-white"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => console.log('Custom action')}>
              Custom Action
            </Button>
          </div>
        </div>
      ),
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white mb-4">Modal Examples</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button onClick={handleShowConfirm} variant="outline">
          Show Confirm Dialog
        </Button>
        
        <Button onClick={handleShowAlert} variant="primary">
          Show Alert
        </Button>
        
        <Button onClick={handleShowCustomModal} variant="secondary">
          Show Custom Modal
        </Button>
        
        <ModalTrigger
          modalConfig={{
            id: 'trigger-modal',
            title: 'Modal via Trigger',
            content: (
              <div className="space-y-4">
                <p className="text-zinc-300">
                  This modal was opened using the ModalTrigger component.
                </p>
                <p className="text-zinc-400 text-sm">
                  You can wrap any element with ModalTrigger to make it open a modal.
                </p>
              </div>
            ),
            size: 'md',
          }}
        >
          <Button variant="transparent">
            Open via Trigger
          </Button>
        </ModalTrigger>
      </div>
    </div>
  );
};

const ModalDemo: React.FC = () => {
  return (
    <ModalProvider>
      <div className="p-6">
        <ModalDemoContent />
        <Modal />
      </div>
    </ModalProvider>
  );
};

export default ModalDemo; 