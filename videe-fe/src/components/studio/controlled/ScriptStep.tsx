import React, { useEffect, useRef, useState } from 'react';
import {
  FiSmile, FiFrown, FiZap, FiWind, FiEye, FiTrendingUp,
  FiHeart, FiStar, FiShield, FiTarget,
  FiLoader, FiRefreshCw
} from 'react-icons/fi';

import { GenerationDetails, ScriptGenerationParams, ScriptGenerationResponse } from '@/lib/videoGenieApi';
import { UseStepResponseResult } from '@/hooks/useGenerationSteps';
import { ShimmerLoaderBars } from '@/components/Shimmers';

// Mood to icon mapping
const getMoodIcon = (mood: string) => {
  const moodLower = mood.toLowerCase();
  switch (moodLower) {
    case 'happy': return <FiSmile className="text-yellow-400" />;
    case 'sad': return <FiFrown className="text-blue-400" />;
    case 'exciting': return <FiZap className="text-orange-400" />;
    case 'calm': return <FiWind className="text-green-400" />;
    case 'mysterious': return <FiEye className="text-purple-400" />;
    case 'inspirational': return <FiTrendingUp className="text-indigo-400" />;
    case 'funny': return <FiSmile className="text-yellow-400" />;
    case 'scary': return <FiEye className="text-red-400" />;
    case 'romantic': return <FiHeart className="text-pink-400" />;
    case 'dramatic': return <FiStar className="text-purple-400" />;
    case 'thrilling': return <FiZap className="text-red-400" />;
    case 'powerful': return <FiShield className="text-blue-600" />;
    case 'neutral':
    default: return <FiTarget className="text-gray-400" />;
  }
};

// Typing effect component
const TypingEffect = ({ text, speed = 50, isFirstTime = false }: { text: string, speed?: number, isFirstTime?: boolean }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isFirstTime && currentIndex < text.length && text.length > 0) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed, isFirstTime]);

  useEffect(() => {
    if (text !== displayedText) {
      setDisplayedText('');
      setCurrentIndex(0);
    }
  }, [text, displayedText]);

  if (!isFirstTime) {
    return <span className="text-white font-medium">{text}</span>;
  }

  return (
    <span className="text-white font-medium">
      {displayedText}
      {currentIndex < text.length && <span className="animate-pulse">|</span>}
    </span>
  );
};

const ScriptStep = ({
  generation,
  scriptGeneration,
  setGeneration
}: {
  generation: GenerationDetails | null,
  scriptGeneration: UseStepResponseResult<ScriptGenerationResponse, ScriptGenerationParams> | null,
  setGeneration?: (generation: GenerationDetails | null) => void
}) => {
  const { isLoading, error, execute, data } = scriptGeneration || {};
  const [isFirstTimeGeneration, setIsFirstTimeGeneration] = useState(true);
  const lastExecutedIdRef = useRef<string | null>(null);
  const hasExecutedRef = useRef(false);

  // Execute script generation only once per generationId; fetch memories from prompt and pass to backend
  useEffect(() => {
    if (
      !execute ||
      !generation?.generationId ||
      generation.script?.content ||
      lastExecutedIdRef.current === generation.generationId ||
      hasExecutedRef.current
    ) {
      return;
    }

    const generationId = generation.generationId;
    lastExecutedIdRef.current = generationId;
    hasExecutedRef.current = true;
    setIsFirstTimeGeneration(true);

    const prompt = generation.initialParams?.prompt || generation.prompt || '';
    const run = async () => {
      let memories: string[] = [];
      if (prompt.trim()) {
        try {
          const res = await fetch('/api/memories/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: prompt.trim(), topK: 10 }),
          });
          const data = await res.json();
          if (res.ok) {
            const list = Array.isArray(data) ? data : data?.memories ?? data?.results ?? [];
            memories = (Array.isArray(list) ? list : [])
              .map((m: { memory?: string }) => m?.memory)
              .filter((s): s is string => typeof s === 'string' && s.length > 0);
          }
        } catch {
          // continue without memories
        }
      }
      await execute(generationId, memories.length ? { memories } : undefined);
    };
    run();
  }, [generation?.generationId, generation?.script?.content, generation?.initialParams?.prompt, generation?.prompt, execute]);

  // Reset execution flag when generationId changes
  useEffect(() => {
    if (generation?.generationId && lastExecutedIdRef.current !== generation.generationId) {
      hasExecutedRef.current = false;
    }
  }, [generation?.generationId]);

  // Update generation state when script data is received
  useEffect(() => {
    if (data && generation && setGeneration) {
      // Check if the script content is actually different to prevent infinite loops
      const currentScriptContent = generation.script?.content;
      const newScriptContent = data.script;
      
      if (currentScriptContent !== newScriptContent) {
        const updatedGeneration = {
          ...generation,
          script: {
            content: data.script,
            mood: data.mood,
            source: 'generated'
          },
          status: 'script_generated' as const
        };
        setGeneration(updatedGeneration);
      }
    }
  }, [data, generation, setGeneration]);

  // Set isFirstTimeGeneration to false once script is generated
  useEffect(() => {
    if (generation?.script?.content && isFirstTimeGeneration) {
      setIsFirstTimeGeneration(false);
    }
  }, [generation?.script?.content, isFirstTimeGeneration]);

  const handleRegenerate = async () => {
    if (!execute || !generation?.generationId) return;
    setIsFirstTimeGeneration(true);
    const prompt = generation.initialParams?.prompt || generation.prompt || '';
    let memories: string[] = [];
    if (prompt.trim()) {
      try {
        const res = await fetch('/api/memories/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: prompt.trim(), topK: 10 }),
        });
        const data = await res.json();
        if (res.ok) {
          const list = Array.isArray(data) ? data : data?.memories ?? data?.results ?? [];
          memories = (Array.isArray(list) ? list : [])
            .map((m: { memory?: string }) => m?.memory)
            .filter((s): s is string => typeof s === 'string' && s.length > 0);
        }
      } catch {
        // continue without memories
      }
    }
    await execute(generation.generationId, memories.length ? { memories } : undefined);
  };

  if (isLoading) {
    return (
        <div className="space-y-4 flex flex-col items-center justify-center max-w-4xl mx-auto mt-14">
            <p className="text-white font-medium flex items-center gap-2">
                <FiLoader className="animate-spin" /> Generating Script...
            </p>
            <ShimmerLoaderBars />
        </div>
    );
}

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  const scriptContent = generation?.script?.content || 'No prompt available';

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold text-white flex justify-between items-center">
        Step 2<span className="text-zinc-400 text-sm">Script Generation</span>
        {generation?.script?.content && (
          <button
            onClick={handleRegenerate}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm rounded-md transition-colors"
          >
            <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        )}
      </h2>
      <div className="mt-6">
        <p className="text-zinc-300 mb-2 text-sm">Your Generated Script:</p>
        <div className="text-white font-medium min-h-[1.5rem]">
          <TypingEffect text={scriptContent} speed={5} isFirstTime={isFirstTimeGeneration} />
        </div>
      </div>
      <div className="mt-8 flex gap-2">
        <div className="bg-zinc-900 rounded-lg flex-1">
          <div className="flex items-start gap-1 flex-col">
            <p className="text-zinc-300 text-sm">Script Mood: </p>
            <div className="flex items-center gap-2">
              <p className="text-white font-medium flex items-center gap-2">
                {generation?.script?.mood
                  ? generation.script.mood.charAt(0).toUpperCase() + generation.script.mood.slice(1).toLowerCase()
                  : 'No mood available'}
                {getMoodIcon(generation?.script?.mood || 'neutral')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptStep;
