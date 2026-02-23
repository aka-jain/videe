import { useState, useEffect } from 'react';

interface UseLocalStorageLoadingOptions {
  key: string;
  initialLoadingState?: boolean;
  expirationTime?: number; // in milliseconds, default 24 hours
  forceRefresh?: boolean; // bypass localStorage check
}

interface UseLocalStorageLoadingReturn {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  markAsLoaded: () => void;
  resetLoading: () => void;
  isFirstTime: boolean;
}

export const useLocalStorageLoading = ({
  key,
  initialLoadingState = true,
  expirationTime = 24 * 60 * 60 * 1000, // 24 hours default
  forceRefresh = false
}: UseLocalStorageLoadingOptions): UseLocalStorageLoadingReturn => {
  const [isLoading, setIsLoading] = useState(initialLoadingState);
  const [isFirstTime, setIsFirstTime] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storageKey = `loading_${key}`;
    const timestampKey = `loading_timestamp_${key}`;

    // Check if we should skip loading based on localStorage
    if (!forceRefresh) {
      const hasLoadedBefore = localStorage.getItem(storageKey);
      const lastLoadTimestamp = localStorage.getItem(timestampKey);

      if (hasLoadedBefore && lastLoadTimestamp) {
        const timestamp = parseInt(lastLoadTimestamp, 10);
        const now = Date.now();

        // Check if the stored timestamp is still valid (not expired)
        if (now - timestamp < expirationTime) {
          setIsLoading(false);
          setIsFirstTime(false);
          return;
        }
      }
    }

    // If no valid localStorage data or force refresh, start with loading state
    setIsLoading(initialLoadingState);
    setIsFirstTime(true);
  }, [key, initialLoadingState, expirationTime, forceRefresh]);

  const markAsLoaded = () => {
    if (typeof window === 'undefined') return;

    const storageKey = `loading_${key}`;
    const timestampKey = `loading_timestamp_${key}`;

    localStorage.setItem(storageKey, 'true');
    localStorage.setItem(timestampKey, Date.now().toString());
    
    setIsLoading(false);
    setIsFirstTime(false);
  };

  const resetLoading = () => {
    if (typeof window === 'undefined') return;

    const storageKey = `loading_${key}`;
    const timestampKey = `loading_timestamp_${key}`;

    localStorage.removeItem(storageKey);
    localStorage.removeItem(timestampKey);
    
    setIsLoading(initialLoadingState);
    setIsFirstTime(true);
  };

  return {
    isLoading,
    setIsLoading,
    markAsLoaded,
    resetLoading,
    isFirstTime
  };
};

// Utility function to clear all loading states
export const clearAllLoadingStates = () => {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('loading_') || key.startsWith('loading_timestamp_'))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
};

// Utility function to get loading state for a specific key
export const getLoadingState = (key: string): boolean => {
  if (typeof window === 'undefined') return true;

  const storageKey = `loading_${key}`;
  const timestampKey = `loading_timestamp_${key}`;
  
  const hasLoadedBefore = localStorage.getItem(storageKey);
  const lastLoadTimestamp = localStorage.getItem(timestampKey);

  if (!hasLoadedBefore || !lastLoadTimestamp) {
    return true; // First time, should show loading
  }

  const timestamp = parseInt(lastLoadTimestamp, 10);
  const now = Date.now();
  const expirationTime = 24 * 60 * 60 * 1000; // 24 hours

  // If expired, should show loading again
  return now - timestamp >= expirationTime;
}; 