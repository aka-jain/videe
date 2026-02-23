'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiVideo, FiPlay, FiPause, FiVolume2, FiVolumeX } from 'react-icons/fi';

interface MergingVideosProps {
  className?: string;
}

const MergingVideos: React.FC<MergingVideosProps> = ({ className = "" }) => {
  const [isMerging, setIsMerging] = useState(true);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Simulate merging process
    const mergeInterval = setInterval(() => {
      setMergeProgress(prev => {
        if (prev >= 100) {
          setIsMerging(false);
          clearInterval(mergeInterval);
          return 100;
        }
        return prev + Math.random() * 8;
      });
    }, 300);

    return () => clearInterval(mergeInterval);
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className={`merging-videos w-full ${className}`}>
      <div className="flex flex-col items-center justify-center h-full p-2 w-full">
        <h2 className="text-lg font-bold text-cyan-100 mb-3 flex items-center gap-2 mt-6">
          <FiVideo className="text-cyan-200" />
          {isMerging ? 'Merging Videos' : 'Final Video'}
        </h2>
        
        <div className="w-full max-w-3xl">
          {isMerging ? (
            // Merging State
            <div className="flex flex-col items-center space-y-4">
              {/* Merging Loader */}
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-3 border-cyan-800 rounded-full"></div>
                <div 
                  className="absolute inset-0 border-3 border-cyan-400 rounded-full border-t-transparent animate-spin"
                  style={{ 
                    background: `conic-gradient(from 0deg, transparent ${mergeProgress * 3.6}deg, #0891b2 ${mergeProgress * 3.6}deg, #0891b2 360deg)` 
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FiVideo className="text-cyan-300 text-2xl" />
                </div>
              </div>
              
              {/* Progress Text */}
              <div className="text-center">
                <div className="text-cyan-200 font-semibold text-base mb-1">
                  Merging {Math.round(mergeProgress)}%
                </div>
                <div className="text-cyan-300 text-xs">
                  Combining video clips and images...
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full max-w-sm">
                <div className="w-full bg-cyan-800 rounded-full h-1.5">
                  <div 
                    className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${mergeProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            // Final Video State
            <div className="flex flex-col items-center space-y-4">
              {/* Video Player */}
              <div className="relative w-full max-w-lg aspect-video bg-gradient-to-br from-cyan-600/30 to-cyan-800/30 rounded-lg overflow-hidden h-[200px]">
                {/* Video Element */}
                <video 
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  // poster="/bg-hero.png"
                  controls={false}
                  muted={isMuted}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                >
                  <source src="/vid.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
                {/* Video Controls Overlay */}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    onClick={togglePlay}
                    className="bg-cyan-400/80 hover:bg-cyan-400 text-white p-2 rounded-full transition-all"
                  >
                    {isPlaying ? (
                      <FiPause className="text-base" />
                    ) : (
                      <FiPlay className="text-base ml-0.5" />
                    )}
                  </button>
                </div>
                
                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={togglePlay}
                        className="text-white hover:text-cyan-300 transition-colors text-sm"
                      >
                        {isPlaying ? <FiPause /> : <FiPlay />}
                      </button>
                      <button
                        onClick={toggleMute}
                        className="text-white hover:text-cyan-300 transition-colors text-sm"
                      >
                        {isMuted ? <FiVolumeX /> : <FiVolume2 />}
                      </button>
                    </div>
                    <div className="text-white text-xs">
                      00:15 / 00:45
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Video Info */}
              <div className="text-center space-y-1">
               
                <p className="text-cyan-300 text-xs">
                  Duration: 00:45 • Size: 8.2 MB • Quality: HD
                </p>
              </div>
            
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MergingVideos; 