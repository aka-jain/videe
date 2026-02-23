'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { initGeneration, InitGenerationParams } from '../lib/videoGenieApi';
import { VideoResolution } from '../config/studio';
import { useGeneration } from '../contexts/GenerationContext';
import { LocaleCode } from '../config/languages';

interface UseVideoGenerationOptions {
  onSuccess?: (generationId: string) => void;
  onError?: (error: Error) => void;
}

export function useVideoGeneration(options: UseVideoGenerationOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { refresh } = useGeneration();

  const generateVideoWithStages = useCallback(async (
    params: {
      prompt: string,
      language: LocaleCode,
      resolution: VideoResolution,
      twoPhaseGeneration: boolean,
      isInstantVideo?: boolean,
      voiceId?: string
    }
  ) => {
    const { prompt, language, resolution, twoPhaseGeneration, isInstantVideo = true, voiceId } = params;
    if (!prompt.trim()) return;

    setIsLoading(true);

    try {
      // Call the init API to get a generation ID
      const params: InitGenerationParams = {
        prompt,
        options: {
          aspectRatio: resolution,
          useFancyCaptions: false,
          languageCode: language,
          twoPhaseScriptGeneration: twoPhaseGeneration,
          voiceId: voiceId!,
        },
        isInstantVideo
      };

      console.log('Calling initGeneration with params:', params);
      const result = await initGeneration(params);
      console.log('Init generation API response:', result);

      const generationId = result.generationId;
      console.log('Extracted generationId:', generationId);

      // Call history API instantly to refresh the generation list
      await refresh();

      // Call success callback
      options.onSuccess?.(generationId);

      // Navigate to the generation page where the actual video generation will be handled
      const redirectUrl = `/studio/create/${generationId}${isInstantVideo ? '' : '/controlled'}`;
      console.log('Redirecting to:', redirectUrl);

      try {
        router.push(redirectUrl);
      } catch (routerError) {
        console.error('Router navigation failed, using window.location:', routerError);
        // Fallback to window.location if router fails
        window.location.href = redirectUrl;
      }

    } catch (error) {
      console.error('Error initializing video generation:', error);
      options.onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [router, options, refresh]);

  const resetGeneration = useCallback(() => {
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    generateVideo: generateVideoWithStages,
    resetGeneration
  };
} 