import React, { useEffect, useRef, useState } from 'react';
import { FiVideo, FiFilm, FiCheck, FiLoader } from 'react-icons/fi';
import { GenerationDetails, ConcatenateResponse } from '@/lib/videoGenieApi';
import { UseStepResponseResult } from '@/hooks/useGenerationSteps';
import { ShimmerLoaderBars } from '@/components/Shimmers';

const MergeClipsStep = ({
  generation,
  concatenateClips,
  setGeneration
}: {
  generation: GenerationDetails | null,
  concatenateClips: UseStepResponseResult<ConcatenateResponse> | null,
  setGeneration?: (generation: GenerationDetails | null) => void
}) => {
  const { isLoading, error, execute, data } = concatenateClips || {};
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const hasExecutedRef = useRef(false);
  const lastExecutedIdRef = useRef<string | null>(null);

  // Trigger merge only once per generationId
  useEffect(() => {
    if (
      execute &&
      generation?.generationId &&
      !generation.baseVideo?.mergedVideoUrl &&
      !hasExecutedRef.current &&
      lastExecutedIdRef.current !== generation.generationId
    ) {
      hasExecutedRef.current = true;
      lastExecutedIdRef.current = generation.generationId;
      setIsFirstTime(true);
      execute(generation.generationId);
    }
  }, [generation?.generationId, generation?.baseVideo?.mergedVideoUrl, execute]);

  // Reset ref when generationId changes
  useEffect(() => {
    if (generation?.generationId && lastExecutedIdRef.current !== generation.generationId) {
      hasExecutedRef.current = false;
    }
  }, [generation?.generationId]);

  // Update generation state when merged video is ready
  useEffect(() => {
    if (data && generation && setGeneration) {
      const currentMergedUrl = generation.baseVideo?.mergedVideoUrl;
      const newMergedUrl = data.videoUrl;
      if (currentMergedUrl !== newMergedUrl) {
        const updatedGeneration = {
          ...generation,
          baseVideo: {
            mergedVideoUrl: newMergedUrl
          },
          status: 'video_merged' as const
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
          <FiLoader className="animate-spin" /> Merging Video Clips...
        </p>
        <ShimmerLoaderBars />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Merge Error: {error}</div>;
  }

  const mergedUrl = generation?.baseVideo?.mergedVideoUrl || data?.videoUrl;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold text-white flex justify-between items-center">
        Step 5<span className="text-zinc-400 text-sm">Merge Clips</span>
      </h2>
      <div className="mt-6 flex items-center gap-2 mb-2">
        <FiFilm className="text-green-400" />
        <p className="text-zinc-300 text-sm">Merging Video Clips:</p>
        {mergedUrl && <FiCheck className="text-green-400" />}
      </div>
      <div className="text-white font-medium min-h-[1.5rem]">
        {mergedUrl
          ? 'Clips merged successfully!'
          : isFirstTime
            ? 'Merging clips...'
            : 'No merged video available.'}
      </div>
      {mergedUrl && (
        <div className="bg-zinc-900 rounded-lg p-4 flex flex-col items-center justify-center">
          <p className="text-zinc-300 mb-3 text-sm">Merged Video Preview:</p>
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
                <source src={mergedUrl} type="video/mp4" />
                Your browser does not support the video element.
              </video>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MergeClipsStep; 