'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '../contexts/SidebarContext';

const StudioHeader: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'create' | 'dashboard'>('dashboard');

  useEffect(() => {
    if (pathname.startsWith('/studio/create')) {
      setViewMode('create');
    } else {
      setViewMode('dashboard');
    }
  }, [pathname]);

  const handleViewModeChange = (mode: 'create' | 'dashboard') => {
    setViewMode(mode);
    if (mode === 'create') {
      router.push('/studio/create');
    } else {
      router.push('/studio/dashboard');
    }
  };

  return (
    <header className="w-full flex items-center justify-between bg-zinc-900 text-white px-8 py-4 shadow border-b border-zinc-800 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="flex bg-zinc-800 rounded-full p-1 ml-6">
          <button
            onClick={() => handleViewModeChange('create')}
            className={`flex-1 cursor-pointer py-1.5 px-4 text-sm font-semibold rounded-full transition-colors ${viewMode === 'create' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-700'}`}
          >
            Videos
          </button>
          {/* Dashboard tab commented out for now
          <button
            onClick={() => handleViewModeChange('dashboard')}
            className={`flex-1 cursor-pointer py-1.5 px-4 text-sm font-semibold rounded-full transition-colors ${viewMode === 'dashboard' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-700'}`}
          >
            Dashboard
          </button>
          */}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400">Studio</span>
      </div>
    </header>
  );
};

export default StudioHeader; 