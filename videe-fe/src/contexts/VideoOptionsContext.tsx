'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VideoOptionsContextType {
  videoOptionsCollapsed: boolean;
  setVideoOptionsCollapsed: (collapsed: boolean) => void;
  toggleVideoOptions: () => void;
}

const VideoOptionsContext = createContext<VideoOptionsContextType | undefined>(undefined);

export const useVideoOptions = () => {
  const context = useContext(VideoOptionsContext);
  if (context === undefined) {
    throw new Error('useVideoOptions must be used within a VideoOptionsProvider');
  }
  return context;
};

interface VideoOptionsProviderProps {
  children: ReactNode;
}

export const VideoOptionsProvider: React.FC<VideoOptionsProviderProps> = ({ children }) => {
  const [videoOptionsCollapsed, setVideoOptionsCollapsed] = useState(true);

  const toggleVideoOptions = () => {
    setVideoOptionsCollapsed(!videoOptionsCollapsed);
  };

  const value = {
    videoOptionsCollapsed,
    setVideoOptionsCollapsed,
    toggleVideoOptions,
  };

  return (
    <VideoOptionsContext.Provider value={value}>
      {children}
    </VideoOptionsContext.Provider>
  );
}; 