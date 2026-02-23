'use client';

import React from 'react';
import Sidebar from '../../components/Sidebar';
import StudioHeader from '../../components/StudioHeader';
import { SidebarProvider, useSidebar } from '../../contexts/SidebarContext';
import { VideoOptionsProvider } from '../../contexts/VideoOptionsContext';
import { ModalProvider } from '../../contexts/ModalContext';
import { GenerationProvider } from '../../contexts/GenerationContext';
import Modal from '../../components/Modal';

const StudioLayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sidebarCollapsed } = useSidebar();

  return (
    <div className="flex min-h-screen bg-zinc-900">
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 h-full z-30">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
        {/* Fixed Header */}
        <div className={`fixed top-0 right-0 z-20 transition-all duration-300 ${sidebarCollapsed ? 'left-16' : 'left-56'}`}>
          <StudioHeader />
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 bg-zinc-900 mt-16 ml-8">{children}</main>
      </div>

      {/* Global Modal Component */}
      <Modal />
    </div>
  );
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <GenerationProvider options={{ limit: 100, sortOrder: 'desc', autoRefresh: true, refreshInterval: 30000 }}>
      <SidebarProvider>
        <VideoOptionsProvider>
          <ModalProvider>
            <StudioLayoutContent>{children}</StudioLayoutContent>
          </ModalProvider>
        </VideoOptionsProvider>
      </SidebarProvider>
    </GenerationProvider>
  );
} 