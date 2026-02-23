import React, { useEffect, useRef, useState } from 'react';
import { FiFilm, FiCheck, FiLoader } from 'react-icons/fi';
import { GenerationDetails, SubtitlesResponse } from '@/lib/videoGenieApi';
import { UseStepResponseResult } from '@/hooks/useGenerationSteps';
import { ShimmerLoaderBars } from '@/components/Shimmers';

const ApplySubtitlesStep = ({
  generation,
  applySubtitles,
  setGeneration
}: {
  generation: GenerationDetails | null,
  applySubtitles: UseStepResponseResult<SubtitlesResponse> | null,
  setGeneration?: (generation: GenerationDetails | null) => void
}) => {
  const { isLoading, error, execute, data } = applySubtitles || {};
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const hasExecutedRef = useRef(false);
  const lastExecutedIdRef = useRef<string | null>(null);

  // Trigger apply subtitles only once per generationId; fetch caption styling preferences from memories
  useEffect(() => {
    if (
      !execute ||
      !generation?.generationId ||
      generation.finalVideo?.videoUrl ||
      hasExecutedRef.current ||
      lastExecutedIdRef.current === generation.generationId
    ) {
      return;
    }

    hasExecutedRef.current = true;
    lastExecutedIdRef.current = generation.generationId;
    setIsFirstTime(true);
    const generationId = generation.generationId;

    const run = async () => {
      let memories: string[] = [];
      try {
        const res = await fetch('/api/memories/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'caption subtitle style preference',
            topK: 10
          }),
        });
        const data = await res.json();
        if (res.ok) {
          const list = Array.isArray(data) ? data : data?.memories ?? data?.results ?? [];
          memories = (Array.isArray(list) ? list : [])
            .map((m: { memory?: string }) => m?.memory)
            .filter((s: unknown): s is string => typeof s === 'string' && s.length > 0);
        }
      } catch {
        // continue without memories
      }
      await execute(generationId, memories.length ? { memories } : undefined);
    };
    run();
  }, [generation?.generationId, generation?.finalVideo?.videoUrl, execute]);

  // Reset ref when generationId changes
  useEffect(() => {
    if (generation?.generationId && lastExecutedIdRef.current !== generation.generationId) {
      hasExecutedRef.current = false;
    }
  }, [generation?.generationId]);

  // Update generation state when final video is ready
  useEffect(() => {
    if (data && generation && setGeneration) {
      const currentFinalUrl = generation.finalVideo?.videoUrl;
      const newFinalUrl = data.finalVideoUrl;
      if (currentFinalUrl !== newFinalUrl) {
        const updatedGeneration = {
          ...generation,
          finalVideo: {
            videoUrl: newFinalUrl
          },
          status: 'final_video_ready' as const
        };
        setGeneration(updatedGeneration);
        setIsFirstTime(false);
      }
    }
  }, [data, generation, setGeneration]);

  if (isLoading) {
    return (
      <div className="space-y-4 flex flex-col items-center justify-center max-w-4xl mx-auto mt-14">
        <p className="text-white font-medium flex items-center gap-2">
          <FiLoader className="animate-spin" /> Applying Subtitles...
        </p>
        <ShimmerLoaderBars />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Subtitles Error: {error}</div>;
  }

  const finalUrl = generation?.finalVideo?.videoUrl || data?.finalVideoUrl;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold text-white flex justify-between items-center">
        Step 6<span className="text-zinc-400 text-sm">Apply Subtitles</span>
      </h2>
      <div className="mt-6 flex items-center gap-2 mb-2">
        <FiFilm className="text-yellow-400" />
        <p className="text-zinc-300 text-sm">Applying Subtitles:</p>
        {finalUrl && <FiCheck className="text-green-400" />}
      </div>
      <div className="text-white font-medium min-h-[1.5rem]">
        {finalUrl
          ? 'Subtitles applied successfully!'
          : isFirstTime
            ? 'Applying subtitles...'
            : 'No final video available.'}
      </div>
      {finalUrl && (
        <div className="bg-zinc-900 rounded-lg p-4 flex flex-col items-center justify-center">
          <p className="text-zinc-300 mb-3 text-sm">Final Video Preview with SubTitles:</p>

          {videoError ? (
            <div className="text-red-500 mt-4 text-center">
              Failed to load video. Please try again later or contact support.
            </div>
          ) : (
            <>
              {videoLoading && (
                <div className="flex flex-col items-center justify-center min-h-[280px] min-w-[280px] mb-6">
                  <FiLoader className="animate-spin text-4xl text-white-400 mb-2" />
                  <span className="text-zinc-400">Loading video...</span>
                </div>
              )}
              <video
                controls
                className={`h-[520px] min-w-[280px] rounded shadow-lg shadow-zinc-900/50 ${videoLoading ? 'hidden' : ''}`}
                onLoadedData={() => setVideoLoading(false)}
                onError={() => setVideoError(true)}
              >
                <source src={finalUrl} type="video/mp4" />
                Your browser does not support the video element.
              </video>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ApplySubtitlesStep; 