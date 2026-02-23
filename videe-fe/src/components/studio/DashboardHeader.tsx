'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { PAGE_TITLES } from '../../config/dashboard';

interface DashboardHeaderProps {
  title: keyof typeof PAGE_TITLES;
  showCreateButton?: boolean;
  createButtonText?: string;
  createButtonHref?: string;
  children?: React.ReactNode;
}

export default function DashboardHeader({
  title,
  showCreateButton = true,
  createButtonText = 'Create Video',
  createButtonHref = '/studio/create',
  children
}: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-3xl font-bold text-zinc-200">
        {PAGE_TITLES[title]}
      </h1>
      
      <div className="flex items-center gap-4">
        {children}
        
        {showCreateButton && (
          <Link
            href={createButtonHref}
            className={`mb-2 px-8 py-3 text-white shadow-lg hover:shadow-xl hover:from-blue-500 hover:to-blue-700 focus:ring-blue-500 active:from-blue-600 active:to-blue-800 rounded-full flex py-2 items-center gap-1 justify-center text-sm bg-gradient-to-r from-blue-500 to-blue-800`}
          >
            <Plus size={14}/>
            <span className="font-medium">{createButtonText}</span>
          </Link>
        )}
      </div>
    </div>
  );
} 