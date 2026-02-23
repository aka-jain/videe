import React, { useEffect, useRef, useState } from 'react';
import { FiTag, FiVideo, FiClock, FiCheck, FiLoader } from 'react-icons/fi';

import { GenerationDetails, KeywordsGenerationParams, KeywordsGenerationResponse, ClipsGenerationParams, ClipsGenerationResponse } from '@/lib/videoGenieApi';
import { UseStepResponseResult } from '@/hooks/useGenerationSteps';
import { ShimmerLoaderBars } from '@/components/Shimmers';

// Typing effect component for keywords
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

const ClipProcessingStep = ({
    generation,
    keywordsGeneration,
    clipsGeneration,
    setGeneration
}: {
    generation: GenerationDetails | null,
    keywordsGeneration: UseStepResponseResult<KeywordsGenerationResponse, KeywordsGenerationParams> | null,
    clipsGeneration: UseStepResponseResult<ClipsGenerationResponse, ClipsGenerationParams> | null,
    setGeneration?: (generation: GenerationDetails | null) => void
}) => {
    const { isLoading: keywordsLoading, error: keywordsError, execute: executeKeywords, data: keywordsData } = keywordsGeneration || {};
    const { isLoading: clipsLoading, error: clipsError, execute: executeClips, data: clipsData } = clipsGeneration || {};

    const [isFirstTimeGeneration, setIsFirstTimeGeneration] = useState(true);
    const [currentPhase, setCurrentPhase] = useState<'keywords' | 'clips' | 'completed'>('keywords');
    const lastExecutedIdRef = useRef<string | null>(null);
    const hasExecutedKeywordsRef = useRef(false);
    const hasExecutedClipsRef = useRef(false);

    // Execute keyword generation first
    useEffect(() => {
        if (
            executeKeywords &&
            generation?.generationId &&
            !generation.keywords?.clipTimings &&
            lastExecutedIdRef.current !== generation.generationId &&
            !hasExecutedKeywordsRef.current
        ) {
            lastExecutedIdRef.current = generation.generationId;
            hasExecutedKeywordsRef.current = true;
            setIsFirstTimeGeneration(true);
            setCurrentPhase('keywords');
            executeKeywords(generation.generationId);
        }
    }, [generation?.generationId, generation?.keywords?.clipTimings, executeKeywords]);

    // Execute clip generation after keywords are generated
    useEffect(() => {
        if (
            executeClips &&
            generation?.generationId &&
            generation.keywords?.clipTimings &&
            !generation.clips?.processedClips &&
            !hasExecutedClipsRef.current &&
            currentPhase === 'keywords' &&
            !keywordsLoading &&
            !keywordsError
        ) {
            hasExecutedClipsRef.current = true;
            setCurrentPhase('clips');
            executeClips(generation.generationId);
        }
    }, [generation?.generationId, generation?.keywords?.clipTimings, generation?.clips?.processedClips, executeClips, currentPhase, keywordsLoading, keywordsError]);

    // Reset execution flags when generationId changes
    useEffect(() => {
        if (generation?.generationId && lastExecutedIdRef.current !== generation.generationId) {
            hasExecutedKeywordsRef.current = false;
            hasExecutedClipsRef.current = false;
            setCurrentPhase('keywords');
        }
    }, [generation?.generationId]);

    // Update generation state when keywords data is received
    useEffect(() => {
        if (keywordsData && generation && setGeneration) {
            const currentKeywords = generation.keywords?.clipTimings;
            const newKeywords = keywordsData.clipTimings;

            if (JSON.stringify(currentKeywords) !== JSON.stringify(newKeywords)) {
                const updatedGeneration = {
                    ...generation,
                    keywords: {
                        clipTimings: newKeywords,
                        source: 'generated'
                    },
                    status: 'keywords_generated' as const
                };
                setGeneration(updatedGeneration);
            }
        }
    }, [keywordsData, generation, setGeneration]);

    // Update generation state when clips data is received
    useEffect(() => {
        if (clipsData && generation && setGeneration) {
            const currentClips = generation.clips?.processedClips;
            const newClips = clipsData.processedClips;

            if (JSON.stringify(currentClips) !== JSON.stringify(newClips)) {
                const updatedGeneration = {
                    ...generation,
                    clips: {
                        processedClips: newClips
                    },
                    status: 'clips_processed' as const
                };
                setGeneration(updatedGeneration);
                setCurrentPhase('completed');
            }
        }
    }, [clipsData, generation, setGeneration]);

    // Set isFirstTimeGeneration to false once clips are generated
    useEffect(() => {
        if (generation?.clips?.processedClips && isFirstTimeGeneration) {
            setIsFirstTimeGeneration(false);
        }
    }, [generation?.clips?.processedClips, isFirstTimeGeneration]);

    if (keywordsLoading || clipsLoading) {
        return (
            <div className="space-y-4 flex flex-col items-center justify-center max-w-4xl mx-auto mt-14">
                <p className="text-white font-medium flex items-center gap-2">
                    <FiLoader className="animate-spin" />
                    {keywordsLoading ? 'Generating Keywords...' : 'Processing Video Clips...'}
                </p>
                <ShimmerLoaderBars />
            </div>
        );
    }

    if (keywordsError) {
        return <div className="text-red-500">Keywords Error: {keywordsError}</div>;
    }

    if (clipsError) {
        return <div className="text-red-500">Clips Error: {clipsError}</div>;
    }

    const keywordsContent = generation?.keywords?.clipTimings
        ? `${generation.keywords.clipTimings.length} keywords extracted`
        : 'No keywords available';

    return (
        <div className="space-y-4 max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-white flex justify-between items-center">
                Step 4<span className="text-zinc-400 text-sm">Video Clip Processing</span>
            </h2>

           

            {/* Clips Section */}
            <div className="mt-8">
                <div className="flex items-center gap-2 mb-2">
                    <FiVideo className="text-green-400" />
                    <p className="text-zinc-300 text-sm">Video Clips Processing:</p>
                    {generation?.clips?.processedClips && (
                        <FiCheck className="text-green-400" />
                    )}
                </div>
                <div className="text-white font-medium min-h-[1.5rem]">
                    <TypingEffect
                        text={generation?.clips?.processedClips
                            ? `${generation.clips.processedClips.length} clips processed`
                            : 'Processing clips...'
                        }
                        speed={5}
                        isFirstTime={isFirstTimeGeneration && currentPhase === 'clips'}
                    />
                </div>
            </div>

            {/* Clips Details */}
            {generation?.clips?.processedClips && (
                <div className="bg-zinc-900 rounded-lg py-2">
                    <p className="text-zinc-300 mb-3 text-sm">Processed Clips:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {generation.clips.processedClips.map((clip, index) => (
                            <div key={index} className="bg-zinc-800 rounded p-3">
                                <div className="flex justify-between items-start">
                                    <span className="text-white font-medium">{clip.keyword}</span>
                                    <span className="text-zinc-400 text-sm">
                                        {clip.start}s - {clip.start + clip.duration}s
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                    <span className="text-zinc-300 text-sm">Duration: {clip.actualDuration}s</span>
                                    <FiClock className="text-zinc-400" size={12} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

             {/* Keywords Section */}
             <div className="mt-6">
                <div className="flex items-center gap-2 mb-2">
                    <FiTag className="text-blue-400" />
                    <p className="text-zinc-300 text-sm">Keywords Extraction:</p>
                    {generation?.keywords?.clipTimings && (
                        <FiCheck className="text-green-400" />
                    )}
                </div>
                <div className="text-white font-medium min-h-[1.5rem]">
                    <TypingEffect text={keywordsContent} speed={5} isFirstTime={isFirstTimeGeneration && currentPhase === 'keywords'} />
                </div>
            </div>

            {/* Keywords Details */}
            {generation?.keywords?.clipTimings && (
                <div className="bg-zinc-900 rounded-lg py-2">
                    <p className="text-zinc-300 mb-3 text-sm">Extracted Keywords:</p>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {generation.keywords.clipTimings.map((timing, index) => (
                            <div key={index} className="bg-zinc-800 rounded p-3">
                                <div className="flex justify-between items-start">
                                    <span className="text-white font-medium">{timing.keyword}</span>
                                    <span className="text-zinc-400 text-sm">
                                        {timing.startTime}s - {timing.startTime + timing.duration}s
                                    </span>
                                </div>
                                <p className="text-zinc-300 text-sm mt-1">{timing.sentenceText}</p>
                                <span className="text-blue-400 text-xs">{timing.keywordType}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClipProcessingStep; 