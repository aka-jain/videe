'use client';

import React from 'react';
import { FaEye, FaPlay, FaEdit, FaTrash } from 'react-icons/fa';

interface VideoCardProps {
  title: string;
  views: number;
  date: string;
  duration: string;
  thumbnail?: string;
  showActions?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function VideoCard({
  title,
  views,
  date,
  duration,
  thumbnail,
  showActions = false,
  onClick,
  onEdit,
  onDelete
}: VideoCardProps) {
  return (
    <div 
      className="cursor-pointer flex items-center justify-between p-3 bg-zinc-800 rounded-lg hover:bg-zinc-900 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-20 h-12 bg-zinc-300 rounded-md flex items-center justify-center">
            <FaPlay className="text-zinc-200 text-sm" />
          </div>
          <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
            {duration}
          </div>
        </div>
        <div>
          <h3 className="font-medium text-zinc-200">{title}</h3>
          <p className="text-sm text-zinc-300">{date}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <FaEye />
          <span>{views} views</span>
        </div>
        {showActions && (
          <div className="flex items-center gap-2">
            <button 
              className="p-1 text-zinc-500 hover:text-blue-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
            >
              <FaEdit />
            </button>
            <button 
              className="p-1 text-zinc-500 hover:text-red-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
            >
              <FaTrash />
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 