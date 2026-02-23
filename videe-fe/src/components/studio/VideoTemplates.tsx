'use client';

import React from 'react';
import { VIDEO_TEMPLATES } from '../../config/studio';

interface VideoTemplatesProps {
  onTemplateSelect: (prompt: string) => void;
  isLoading?: boolean;
}

export default function VideoTemplates({ onTemplateSelect, isLoading = false }: VideoTemplatesProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-zinc-400 text-center">
        Choose a template to get started
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full lg:grid-cols-4">
        {VIDEO_TEMPLATES.map((template, index) => (
          <button
            key={index}
            onClick={() => onTemplateSelect(template.prompt)}
            disabled={isLoading}
            className={`bg-zinc-900 cursor-pointer hover:bg-zinc-900 p-4 rounded-xl border border-zinc-700 hover:border-zinc-600 transition-all duration-200 text-left group ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <h4 className="font-medium text-sm text-white group-hover:text-blue-400 transition-colors">
              {template.title}
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              {template.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
} 