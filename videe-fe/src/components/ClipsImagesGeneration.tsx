'use client';

import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { FiVideo, FiImage, FiDownload, FiCheck, FiPlay } from 'react-icons/fi';

interface MediaItem {
  id: string;
  type: 'video' | 'image';
  title: string;
  progress: number;
  status: 'downloading' | 'completed' | 'pending';
  duration?: string;
  size?: string;
}

interface ClipsImagesGenerationProps {
  className?: string;
}

const ClipsImagesGeneration: React.FC<ClipsImagesGenerationProps> = ({ className = "" }) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([
    { id: '1', type: 'video', title: 'IRCTC Booking', progress: 0, status: 'pending', duration: '00:15' },
    { id: '2', type: 'image', title: 'Railway Station', progress: 0, status: 'pending', size: '2.4 MB' },
    { id: '3', type: 'video', title: 'Online Payment Demo', progress: 0, status: 'pending', duration: '00:12' }
  ]);

  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    // Simulate downloading process
    const startDownloading = () => {
      const interval = setInterval(() => {
        setMediaItems(prev => {
          const updated = prev.map(item => {
            if (item.status === 'pending') {
              return { ...item, status: 'downloading' as const, progress: 0 };
            }
            if (item.status === 'downloading' && item.progress < 100) {
              const newProgress = Math.min(item.progress + Math.random() * 15, 100);
              return {
                ...item,
                progress: newProgress,
                status: newProgress >= 100 ? 'completed' as const : 'downloading' as const
              };
            }
            return item;
          });
          return updated;
        });
      }, 500);

      return interval;
    };

    const interval = startDownloading();

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Calculate overall progress
    const completed = mediaItems.filter(item => item.status === 'completed').length;
    const total = mediaItems.length;
    setOverallProgress((completed / total) * 100);
  }, [mediaItems]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FiCheck className="text-cyan-400 text-lg" />;
      case 'downloading':
        return <FiDownload className="text-cyan-400 text-lg animate-pulse" />;
      default:
        return <FiPlay className="text-gray-400 text-lg" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-cyan-400/50 bg-cyan-800/50';
      case 'downloading':
        return 'border-cyan-400/50 bg-cyan-800/50';
      default:
        return 'border-gray-400/50 bg-gray-800/50';
    }
  };

  return (
    <div className={`clips-images-generation w-full ${className}`}>
      <div className="flex flex-col items-center justify-center h-full p-3 w-full">
        <h2 className="text-xl font-bold text-cyan-100 mb-4 flex items-center gap-2 mt-10">
          <FiVideo className="text-cyan-200" />
          Generating Clips & Images
        </h2>

        <div className="w-full max-w-4xl">
          {/* Overall Progress */}


          {/* Media Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mediaItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border-1 transition-all ${getStatusColor(item.status)}`}
              >
                {/* Dummy Image */}
                <div className="w-full h-20 bg-gradient-to-br from-cyan-600/30 to-cyan-800/30 rounded-md mb-3 flex items-center justify-center">
                  {item.type === 'video' ? (
                    <Image src="/bg-hero.png" alt="Video" width={100} height={100} className="w-full h-full object-cover" />
                  ) : (
                    <Image src="/profile.png" alt="Video" width={100} height={100} className="w-full h-full object-cover" />
                  )}
                </div>

                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {item.type === 'video' ? (
                      <FiVideo className="text-cyan-300 text-sm" />
                    ) : (
                      <FiImage className="text-cyan-300 text-sm" />
                    )}
                    <span className="text-xs px-1 py-0.5 bg-cyan-700/50 rounded text-cyan-200">
                      {item.type.toUpperCase()}
                    </span>
                  </div>
                  {getStatusIcon(item.status)}
                </div>

                <h4 className="text-cyan-100 font-medium mb-2 text-xs leading-tight">
                  {item.title}
                </h4>

                <div className="space-y-1">
                  <div className="w-full bg-cyan-800 rounded-full h-1.5">
                    <div
                      className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-cyan-300">
                    <span>{Math.round(item.progress)}%</span>
                    <span>
                      {item.type === 'video' ? item.duration : item.size}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClipsImagesGeneration; 