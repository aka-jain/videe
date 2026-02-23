import React, { useEffect, useState } from 'react';
import { FiVolume2, FiPlay, FiPause, FiDownload, FiMusic, FiMic, FiActivity, FiHeadphones, FiSpeaker, FiVolumeX, FiVolume1, FiVolume, FiClock, FiCheck, FiLoader } from 'react-icons/fi';

import { GenerationDetails, AudioGenerationParams, AudioGenerationResponse } from '@/lib/videoGenieApi';
import { useAudioGeneration, UseStepResponseResult } from '@/hooks/useGenerationSteps';
import { ShimmerLoaderBars } from '@/components/Shimmers';

// Reusable audio player component with controls
const AudioPlayer = ({
    audioUrl,
    isFirstTime = false,
    title,
    icon,
    iconBgColor = "bg-blue-500/20",
    iconColor = "text-blue-400",
    progressColor = "bg-blue-500"
}: {
    audioUrl: string,
    isFirstTime?: boolean,
    title: string,
    icon: React.ReactNode,
    iconBgColor?: string,
    iconColor?: string,
    progressColor?: string
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = React.useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="bg-zinc-900 rounded-lg w-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${iconBgColor} rounded-full flex items-center justify-center`}>
                        <div className={`${iconColor} text-lg`}>
                            {icon}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">{title}</h3>
                        <p className="text-zinc-400 text-sm">{formatTime(duration)}</p>
                    </div>
                </div>
                <button
                    onClick={togglePlayPause}
                    className="w-10 h-10 bg-blue-500 hover:bg-blue-400 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
                >
                    {isPlaying ? <FiPause className="text-sm" /> : <FiPlay className="text-sm ml-1" />}
                </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
                <div className="w-full bg-zinc-700 rounded-full h-2">
                    <div
                        className={`${progressColor} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-xs text-zinc-400 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <audio ref={audioRef} src={audioUrl} preload="metadata" />
        </div>
    );
};

// Speech marks visualization component
const SpeechMarksVisualization = ({ speechMarks }: { speechMarks: Array<{ time: number; type: string; start: number; end: number; value: string }> }) => {
    const sentences = speechMarks.filter(mark => mark.type === 'sentence');
    const words = speechMarks.filter(mark => mark.type === 'word');
    const [showAllSentences, setShowAllSentences] = useState(false);
    const [showAllWords, setShowAllWords] = useState(false);

    const totalDuration = speechMarks.length > 0 ? Math.max(...speechMarks.map(mark => mark.time)) : 0;

    const displayedSentences = showAllSentences ? sentences : sentences.slice(0, 3);
    const displayedWords = showAllWords ? words : words.slice(0, 20);

    return (
        <div className="bg-zinc-900 rounded-lg py-4">
            <div className="flex items-center gap-2 mb-4">
                <FiActivity className="text-purple-400" />
                <p className="text-zinc-300 text-sm">Speech Analysis</p>
            </div>

            <div className="space-y-3 flex justify-between">
                <div className="flex flex-col items-start">
                    <span className="text-zinc-400 text-sm">Sentences:</span>
                    <span className="text-white font-medium text-xl">{sentences.length}</span>
                </div>

                <div className="flex flex-col items-start">
                    <span className="text-zinc-400 text-sm">Words:</span>
                    <span className="text-white font-medium text-xl">{words.length}</span>
                </div>

                <div className="flex flex-col items-start">
                    <span className="text-zinc-400 text-sm">Total Duration:</span>
                    <span className="text-white font-medium text-xl">{Math.round(totalDuration / 1000)}s</span>
                </div>
            </div>

            {/* Sample sentences preview */}
            {sentences.length > 0 && (
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-zinc-400 text-sm">Generated Sentences</p>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {displayedSentences.map((sentence, index) => (
                            <div key={index} className="bg-zinc-800 rounded p-2">
                                <p className="text-white text-sm">{sentence.value}</p>
                                <p className="text-zinc-500 text-xs mt-1">
                                    {Math.round(sentence.time / 1000)}s
                                </p>
                            </div>
                        ))}
                        {!showAllSentences && sentences.length > 3 && (
                            <button
                                onClick={() => setShowAllSentences(true)}
                                className="text-blue-400 hover:text-blue-300 text-xs italic text-center py-2 w-full transition-colors"
                            >
                                +{sentences.length - 3} more sentences
                            </button>
                        )}
                        {showAllSentences && sentences.length > 3 && (
                            <button
                                onClick={() => setShowAllSentences(false)}
                                className="text-blue-400 hover:text-blue-300 text-xs italic text-center py-2 w-full transition-colors"
                            >
                                Show Less
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Words breakdown */}
            {words.length > 0 && (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-zinc-400 text-sm">Words Breakdown (Speech Markups):</p>
                    </div>
                    <div className="bg-zinc-900 rounded">
                        <div className="flex flex-wrap gap-2">
                            {displayedWords.map((word, index) => (
                                <div key={index} className="flex items-center gap-1">
                                    <div className="text-white text-sm bg-zinc-800 px-2 py-1 rounded gap-2">
                                        {word.value}
                                        <div className="text-zinc-500 text-xs">
                                            {Math.round(word.time / 1000)}s
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!showAllWords && words.length > 20 && (
                                <button
                                    onClick={() => setShowAllWords(true)}
                                    className="text-blue-400 hover:text-blue-300 text-xs italic py-2 px-2 transition-colors"
                                >
                                    +{words.length - 20} more words
                                </button>
                            )}
                            {showAllWords && words.length > 20 && (
                                <button
                                    onClick={() => setShowAllWords(false)}
                                    className="text-blue-400 hover:text-blue-300 text-xs italic py-2 px-2 transition-colors"
                                >
                                    Show Less
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

// Audio info display component
const AudioInfo = ({ audio }: { audio: GenerationDetails['audio'] }) => {
    if (!audio) return null;

    return (
        <div className="space-y-4">
            {audio.backgroundMusicUrl && (
                <div className="bg-zinc-900 rounded-lg flex justify-start space-x-10 items-center">
                    <div className="flex flex-col items-start gap-2 mb-2">
                        <p className="text-white text-sm flex items-center gap-2"><FiCheck className="text-green-400" /> Background Music Generated</p>
                        <p className="text-zinc-500 text-xs mb-2">Music enhances the audio experience</p>
                    </div>
                    <div className="flex items-start gap-2 mb-2 w-full flex-1">
                        <AudioPlayer
                            audioUrl={audio.backgroundMusicUrl}
                            isFirstTime={false}
                            title="Background Music"
                            icon={<FiMusic />}
                            iconBgColor="bg-green-500/20"
                            iconColor="text-green-400"
                            progressColor="bg-green-500"
                        />
                    </div>
                </div>
            )}

            {audio.speechMarks && audio.speechMarks.length > 0 && (
                <SpeechMarksVisualization speechMarks={audio.speechMarks} />
            )}
        </div>
    );
};

const AudioStep = ({
    generation,
    audioGeneration,
    setGeneration
}: {
    generation: GenerationDetails | null,
    audioGeneration: UseStepResponseResult<AudioGenerationResponse, AudioGenerationParams> | null,
    setGeneration?: (generation: GenerationDetails | null) => void
}) => {
    const { isLoading, error, execute, reset, data } = audioGeneration || {};
    const [isFirstTimeGeneration, setIsFirstTimeGeneration] = useState(true);
    const hasExecutedRef = React.useRef(false);
    const lastExecutedIdRef = React.useRef<string | null>(null);

    // Update generation state when audio data is received from execute
    useEffect(() => {
        if (data && generation && setGeneration) {
            // Check if the audio URL is actually different to prevent infinite loops
            const currentAudioUrl = generation.audio?.audioUrl;
            const newAudioUrl = data.audioFile;

            if (currentAudioUrl !== newAudioUrl) {
                const updatedGeneration = {
                    ...generation,
                    audio: {
                        audioUrl: data.audioFile,
                        speechMarks: data.speechMarks,
                        backgroundMusicUrl: data.backgroundMusic,
                        duration: 0, // Will be calculated when audio loads
                        scriptContentUsed: generation.script?.content || '',
                        scriptSource: 'project_script' as const
                    },
                    status: 'audio_generated' as const
                };
                setGeneration(updatedGeneration);
            }
        }
    }, [data, generation, setGeneration]);

    // Execute audio generation only once when needed; fetch preferences (audio/caption) from memories and pass
    useEffect(() => {
        if (
            !execute ||
            !generation?.generationId ||
            generation.audio?.audioUrl ||
            hasExecutedRef.current ||
            lastExecutedIdRef.current === generation.generationId
        ) {
            return;
        }

        hasExecutedRef.current = true;
        lastExecutedIdRef.current = generation.generationId;
        setIsFirstTimeGeneration(true);
        const generationId = generation.generationId;

        const run = async () => {
            let memories: string[] = [];
            try {
                const res = await fetch('/api/memories/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: 'audio voice caption subtitle preference',
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
    }, [generation?.generationId, generation?.audio?.audioUrl, execute]);

    // Reset the ref when generationId changes
    useEffect(() => {
        if (generation?.generationId && lastExecutedIdRef.current !== generation.generationId) {
            hasExecutedRef.current = false;
        }
    }, [generation?.generationId]);

    // Set isFirstTimeGeneration to false once audio is generated
    useEffect(() => {
        if (generation?.audio?.audioUrl && isFirstTimeGeneration) {
            setIsFirstTimeGeneration(false);
        }
    }, [generation?.audio?.audioUrl, isFirstTimeGeneration]);

    if (isLoading) {
        return (
            <div className="space-y-4 flex flex-col items-center justify-center max-w-4xl mx-auto mt-14">
                <p className="text-white font-medium flex items-center gap-2">
                    <FiLoader className="animate-spin" /> Generating Voiceover and Background Music...
                </p>
                <ShimmerLoaderBars />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500">
                {error}
            </div>
        )
    }

    const audioUrl = generation?.audio?.audioUrl;

    return (
        <div className="space-y-4 max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-white flex justify-between items-center">
                Step 3
                <span className="text-zinc-400 text-sm">Voiceover & Audio Generation</span>
            </h2>

            <div className="mt-6 flex items-center">
                {/* <p className="text-zinc-300 mb-2 text-sm mb-4">Generated Voiceover</p> */}
                <div className="flex flex-col items-start gap-2 mb-2 space-x-10 min-w-[268px]">
                    <p className="text-white text-sm flex items-center gap-2"><FiCheck className="text-green-400" /> Voiceover Generated</p>
                    <p className="text-zinc-500 text-xs mb-2">{generation?.initialParams?.options?.voiceId} is your narrator</p>
                </div>
                <div className="flex-1">
                    {audioUrl ? (
                        <AudioPlayer
                            audioUrl={audioUrl}
                            isFirstTime={isFirstTimeGeneration}
                            title={generation?.initialParams?.options?.voiceId || 'Voiceover'}
                            icon={<FiVolume2 />}
                            iconBgColor="bg-blue-500/20"
                            iconColor="text-blue-400"
                            progressColor="bg-blue-500"
                        />
                    ) : (
                        <div className="bg-zinc-900 rounded-lg p-8 text-center">
                            <FiVolumeX className="text-zinc-600 text-4xl mx-auto mb-4" />
                            <p className="text-zinc-400">Audio not generated yet!</p>
                        </div>
                    )}
                </div>
            </div>



            {generation?.audio && (
                <div className="mt-8">
                    {/* <p className="text-zinc-300 mb-2 text-sm mb-4 mt-10">Audio Details</p> */}
                    <AudioInfo audio={generation.audio} />
                </div>
            )}
        </div>
    )
};

export default AudioStep; 