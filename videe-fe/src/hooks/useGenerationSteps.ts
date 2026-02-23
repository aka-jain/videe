'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  generateScript,
  generateAudio,
  generateKeywords,
  generateClips,
  concatenateClips,
  applySubtitles,
  ScriptGenerationParams,
  AudioGenerationParams,
  KeywordsGenerationParams,
  ClipsGenerationParams,
  ApplySubtitlesParams,
  ScriptGenerationResponse,
  AudioGenerationResponse,
  KeywordsGenerationResponse,
  ClipsGenerationResponse,
  ConcatenateResponse,
  SubtitlesResponse
} from '../lib/videoGenieApi';

// Common hook options interface
interface UseStepOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

// Generic hook result type for all steps
export type UseStepResponseResult<T, P = any> = {
  isLoading: boolean;
  error: string | null;
  data: T | null;
  execute: (generationId: string, params?: P) => Promise<T>;
  reset: () => void;
};

// Script Generation Hook
export function useScriptGeneration(options: UseStepOptions = {}): UseStepResponseResult<ScriptGenerationResponse, ScriptGenerationParams> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ScriptGenerationResponse | null>(null);

  // Memoize the options to prevent execute function recreation
  const memoizedOptions = useMemo(() => options, [options.onSuccess, options.onError]);

  const execute = useCallback(async (generationId: string, params?: ScriptGenerationParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await generateScript(generationId, params);
      setData(result);
      memoizedOptions.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      memoizedOptions.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [memoizedOptions]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    isLoading,
    error,
    data,
    execute,
    reset
  };
}

// Audio Generation Hook
export function useAudioGeneration(options: UseStepOptions = {}): UseStepResponseResult<AudioGenerationResponse, AudioGenerationParams> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AudioGenerationResponse | null>(null);

  // Memoize the options to prevent execute function recreation
  const memoizedOptions = useMemo(() => options, [options.onSuccess, options.onError]);

  const execute = useCallback(async (generationId: string, params?: AudioGenerationParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await generateAudio(generationId, params);
      setData(result);
      memoizedOptions.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      memoizedOptions.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [memoizedOptions]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    isLoading,
    error,
    data,
    execute,
    reset
  };
}

// Keywords Generation Hook
export function useKeywordsGeneration(options: UseStepOptions = {}): UseStepResponseResult<KeywordsGenerationResponse, KeywordsGenerationParams> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<KeywordsGenerationResponse | null>(null);

  // Memoize the options to prevent execute function recreation
  const memoizedOptions = useMemo(() => options, [options.onSuccess, options.onError]);

  const execute = useCallback(async (generationId: string, params?: KeywordsGenerationParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await generateKeywords(generationId, params);
      setData(result);
      memoizedOptions.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      memoizedOptions.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [memoizedOptions]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    isLoading,
    error,
    data,
    execute,
    reset
  };
}

// Clips Generation Hook
export function useClipsGeneration(options: UseStepOptions = {}): UseStepResponseResult<ClipsGenerationResponse, ClipsGenerationParams> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClipsGenerationResponse | null>(null);

  // Memoize the options to prevent execute function recreation
  const memoizedOptions = useMemo(() => options, [options.onSuccess, options.onError]);

  const execute = useCallback(async (generationId: string, params?: ClipsGenerationParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await generateClips(generationId, params);
      setData(result);
      memoizedOptions.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      memoizedOptions.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [memoizedOptions]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    isLoading,
    error,
    data,
    execute,
    reset
  };
}

// Concatenate Clips Hook
export function useConcatenateClips(options: UseStepOptions = {}): UseStepResponseResult<ConcatenateResponse> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ConcatenateResponse | null>(null);

  // Memoize the options to prevent execute function recreation
  const memoizedOptions = useMemo(() => options, [options.onSuccess, options.onError]);

  const execute = useCallback(async (generationId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await concatenateClips(generationId);
      setData(result);
      memoizedOptions.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      memoizedOptions.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [memoizedOptions]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    isLoading,
    error,
    data,
    execute,
    reset
  };
}

// Apply Subtitles Hook
export function useApplySubtitles(options: UseStepOptions = {}): UseStepResponseResult<SubtitlesResponse, ApplySubtitlesParams> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SubtitlesResponse | null>(null);

  // Memoize the options to prevent execute function recreation
  const memoizedOptions = useMemo(() => options, [options.onSuccess, options.onError]);

  const execute = useCallback(async (generationId: string, params?: ApplySubtitlesParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await applySubtitles(generationId, params);
      setData(result);
      memoizedOptions.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      memoizedOptions.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [memoizedOptions]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    isLoading,
    error,
    data,
    execute,
    reset
  };
}

// Combined hook for all steps
export function useAllGenerationSteps(options: UseStepOptions = {}) {
  // Memoize the options to prevent individual hooks from recreating their execute functions
  const memoizedOptions = useMemo(() => options, [options.onSuccess, options.onError]);

  const scriptGeneration = useScriptGeneration(memoizedOptions);
  const audioGeneration = useAudioGeneration(memoizedOptions);
  const keywordsGeneration = useKeywordsGeneration(memoizedOptions);
  const clipsGeneration = useClipsGeneration(memoizedOptions);
  const concatenateClips = useConcatenateClips(memoizedOptions);
  const applySubtitles = useApplySubtitles(memoizedOptions);

  const resetAll = useCallback(() => {
    scriptGeneration.reset();
    audioGeneration.reset();
    keywordsGeneration.reset();
    clipsGeneration.reset();
    concatenateClips.reset();
    applySubtitles.reset();
  }, [scriptGeneration, audioGeneration, keywordsGeneration, clipsGeneration, concatenateClips, applySubtitles]);

  const isAnyLoading =
    scriptGeneration.isLoading ||
    audioGeneration.isLoading ||
    keywordsGeneration.isLoading ||
    clipsGeneration.isLoading ||
    concatenateClips.isLoading ||
    applySubtitles.isLoading;

  return useMemo(() => ({
    scriptGeneration,
    audioGeneration,
    keywordsGeneration,
    clipsGeneration,
    concatenateClips,
    applySubtitles,
    resetAll,
    isAnyLoading
  }), [
    scriptGeneration,
    audioGeneration,
    keywordsGeneration,
    clipsGeneration,
    concatenateClips,
    applySubtitles,
    resetAll,
    isAnyLoading
  ]);
} 