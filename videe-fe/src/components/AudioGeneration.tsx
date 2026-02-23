'use client';

import React, { useState } from 'react';
import { FaVolumeUp, FaPlay, FaPause, FaDownload } from 'react-icons/fa';

interface AudioGenerationProps {
  className?: string;
}

const AudioGeneration: React.FC<AudioGenerationProps> = ({ className = "" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // Simulate audio progress
    if (!isPlaying) {
      const interval = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 100);
    } else {
      setAudioProgress(0);
    }
  };

  const handleDownload = () => {
    // Simulate download functionality
    console.log('Downloading audio...');
  };

  return (
    <div className={`audio-generation w-full ${className}`}>
      <div className="flex flex-col items-center justify-center h-full p-6 w-full">
        {/* <h2 className="text-2xl font-bold text-cyan-100 mb-6 flex items-center gap-2">
          <FaVolumeUp className="text-cyan-200" />
          Generated Audio
        </h2> */}
        
        <div className="w-full max-w-md mt-2">
          {/* Audio Player Card */}
          <div className="rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-cyan-400/20 rounded-full flex items-center justify-center">
                  <FaVolumeUp className="text-cyan-300 text-xl" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Generated Audio</h3>
                  <p className="text-cyan-200 text-sm">00:02:45</p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="p-2 text-cyan-300 hover:text-cyan-100 transition-colors"
                title="Download Audio"
              >
                <FaDownload className="text-lg" />
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="w-full bg-cyan-200/20 rounded-full h-2">
                <div 
                  className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${audioProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-cyan-200 mt-1">
                <span>00:00</span>
                <span>02:45</span>
              </div>
            </div>
            
            {/* Play/Pause Button */}
            <div className="flex justify-center">
              <button
                onClick={handlePlayPause}
                className="w-12 h-12 bg-cyan-400 hover:bg-cyan-300 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
              >
                {isPlaying ? <FaPause className="text-sm" /> : <FaPlay className="text-sm ml-1" />}
              </button>
            </div>
          </div>
          
         
        </div>
      </div>
    </div>
  );
};

export default AudioGeneration; 