'use client';

import React from 'react';
import { 
  Loader2, 
  RefreshCw,
  Check, 
  FilePenLine, 
  Mic, 
  Search, 
  Clapperboard, 
  Film, 
  MessageSquareText 
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { LOADER_STAGES } from '../../config/studio';

interface VideoGenerationLoaderProps {
  currentStage: string;
  completedStages: Set<string>;
  prompt: string;
  status: 'loading' | 'completed' | 'error';
  onComplete?: () => void;
  onRetry?: () => void;
}

const stageIcons: Record<string, React.ElementType> = {
  script: FilePenLine,
  audio: Mic,
  keywords: Search,
  clips: Clapperboard,
  concatenate: Film,
  subtitles: MessageSquareText,
};

export default function VideoGenerationLoader({
  currentStage,
  completedStages,
  prompt,
  status,
  onComplete,
  onRetry
}: VideoGenerationLoaderProps) {
  const params = useParams();
  const generationId = params.id as string;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl max-w-4xl w-full mx-4 mt-20">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            {status === 'completed' || currentStage === 'complete' ? (
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : status === 'error' ? (
              <div 
                className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-colors"
                onClick={handleRetry}
              >
                <RefreshCw className="w-8 h-8 text-white" />
              </div>
            ) : (
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            )}
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-white">
          {status === 'completed' || currentStage === 'complete' 
            ? 'Video Created Successfully!' 
            : status === 'error'
              ? 'Retry Generation'
              : 'Creating Your Video'
          }
        </h3>
        
        <div className="text-sm text-zinc-400 mb-6">
          "{prompt}"
        </div>
        
        <div className="flex flex-col md:flex-row items-center md:items-start justify-center w-full">
          {LOADER_STAGES.map((stage, index) => {
            const isCompleted = completedStages.has(stage.id);
            const isCurrent = currentStage === stage.id;
            const IconComponent = stageIcons[stage.id];

            return (
              <React.Fragment key={stage.id}>
                <div className="flex flex-col items-center text-center w-32">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
                      isCompleted ? 'bg-green-500' : 'bg-zinc-700'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-6 h-6 text-white" />
                    ) : (
                      <IconComponent
                        className={`w-5 h-5 transition-colors duration-300 ${
                          isCurrent ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      />
                    )}
                  </div>
                  <p
                    className={`mt-3 text-xs font-medium transition-colors duration-300 h-10 flex items-center text-center ${
                      isCompleted
                        ? 'text-green-500'
                        : isCurrent
                        ? 'text-zinc-200'
                        : 'text-zinc-500'
                    }`}
                  >
                    {stage.label}
                  </p>
                </div>

                {index < LOADER_STAGES.length - 1 && (
                  <div
                    className={`transition-colors duration-300 ${
                      isCompleted ? 'bg-green-500' : 'bg-zinc-700'
                    } h-10 w-0.5 md:h-0.5 md:flex-1 md:min-w-10 md:mt-5`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
        
        {status === 'error' && (
          <div className="text-red-400 text-sm mt-6">
            An error occurred during generation. Please try again.
          </div>
        )}
        
        {(status === 'completed' || (status === 'loading' && currentStage === 'complete')) && (
          <div className="text-green-400 text-sm mt-6">
            Video generation completed successfully!
          </div>
        )}
      </div>
    </div>
  );
} 