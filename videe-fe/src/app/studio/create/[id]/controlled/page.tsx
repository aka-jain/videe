'use client';

import { useGeneration } from "@/contexts/GenerationContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { GenerationDetails } from "@/lib/videoGenieApi";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { FiSearch, FiFileText, FiVolume2, FiTag, FiVideo, FiFilm, FiDownload, FiCheck, FiChevronLeft, FiSettings, FiSpeaker } from 'react-icons/fi';

import { useAllGenerationSteps } from "@/hooks/useGenerationSteps";
import ScriptStep from "@/components/studio/controlled/ScriptStep";
import AudioStep from "@/components/studio/controlled/AudioStep";
import ClipProcessingStep from "@/components/studio/controlled/ClipProcessingStep";
import MergeClipsStep from "@/components/studio/controlled/MergeClipsStep";
import ApplySubtitlesStep from "@/components/studio/controlled/ApplySubtitlesStep";
import PreviewDownloadStep from "@/components/studio/controlled/PreviewDownloadStep";
import { ShimmerLoader } from "@/components/ShimmerLoader";
import PromptStep from "@/components/studio/controlled/PromptStep";

interface Step {
    id: string;
    title: string;
    icon: React.ReactNode;
    status: 'pending' | 'active' | 'completed' | 'error';
}

// Define steps outside component to prevent recreation
const BASE_STEPS: Omit<Step, 'status'>[] = [
    { id: 'prompt', title: 'Video Prompt', icon: <FiSearch /> },
    { id: 'initialized', title: 'Script Generation', icon: <FiFileText /> },
    { id: 'script_generated', title: 'Audio Generation', icon: <FiVolume2 /> },
    { id: 'audio_generated', title: 'Video Clip Processing', icon: <FiTag /> },
    { id: 'clips_processed', title: 'Merge Clips', icon: <FiVideo /> },
    { id: 'video_merged', title: 'Apply Subtitles', icon: <FiFilm /> },
    { id: 'final_video_ready', title: 'Preview & Download', icon: <FiDownload /> }
];

export default function ControlledGenerationPage() {
    const [generation, setGeneration] = useState<GenerationDetails | null>(null);
    const [currentStep, setCurrentStep] = useState<string>('prompt');
    const [isRightSectionCollapsed, setIsRightSectionCollapsed] = useState(true);
    const [hasFetched, setHasFetched] = useState(false);
    const params = useParams();
    const generationId = params.id as string;
    const lastFetchedIdRef = useRef<string | null>(null);

    const { scriptGeneration, audioGeneration, keywordsGeneration, clipsGeneration, concatenateClips, applySubtitles } = useAllGenerationSteps();

    const { getGenerationDetails, detailLoading } = useGeneration();
    const { sidebarCollapsed } = useSidebar();

    // Memoize setGeneration to prevent infinite re-renders
    const memoizedSetGeneration = useCallback((newGeneration: GenerationDetails | null) => {
        setGeneration(newGeneration);
    }, []);

    useEffect(() => {
        setHasFetched(false);
    }, [generationId]);

    useEffect(() => {
        if (!hasFetched && generationId) {
            setHasFetched(true);
            getGenerationDetails(generationId)
                .then(generation => {
                    setGeneration(generation);
                    setCurrentStep(generation.status);
                    lastFetchedIdRef.current = generationId;
                })
                .catch(error => {
                    console.error('Error fetching generation:', error);
                });
        }
    }, [generationId, getGenerationDetails, hasFetched]);

    const toggleRightSection = useCallback(() => {
        setIsRightSectionCollapsed(!isRightSectionCollapsed);
    }, [isRightSectionCollapsed]);

    // Determine step status based on generation state
    const getStepStatus = useCallback((stepId: string): 'pending' | 'active' | 'completed' | 'error' => {
        if (!generation) return 'pending';
        switch (stepId) {
            case 'prompt':
                return (generation.prompt || generation.initialParams?.prompt) ? 'completed' : 'active';
            case 'initialized':
                if (generation.script?.content) return 'completed';
                if (generation.status === 'script_generated') return 'completed';
                if (generation.status === 'initialized') return 'active';
                return 'pending';
            case 'script_generated':
                if (generation.audio?.audioUrl) return 'completed';
                if (generation.status === 'audio_generated') return 'completed';
                if (generation.status === 'script_generated') return 'active';
                return 'pending';
            case 'audio_generated':
                if (generation.clips?.processedClips) return 'completed';
                if (generation.status === 'clips_processed') return 'completed';
                if (generation.status === 'keywords_generated') return 'completed';
                if (generation.status === 'audio_generated') return 'active';
                return 'pending';
            case 'keywords_generated':
                if (generation.baseVideo?.mergedVideoUrl) return 'completed';
                if (generation.status === 'video_merged') return 'completed';
                if (generation.status === 'clips_processed') return 'active';
                return 'pending';
            case 'clips_processed': {
                if (generation.baseVideo?.mergedVideoUrl) return 'completed';
                if (generation.status === 'video_merged') return 'completed';
                if (generation.status === 'clips_processed') return 'active';
                const audioStepCompleted = !!generation.clips?.processedClips;
                if (audioStepCompleted) return 'active';
                return 'pending';
            }
            case 'video_merged':
                if (generation.finalVideo?.videoUrl) return 'completed';
                if (generation.status === 'final_video_ready' || generation.status === 'uploaded') return 'completed';
                if (generation.status === 'video_merged') return 'active';
                return 'pending';
            case 'final_video_ready':
                if (generation.finalVideo?.videoUrl) return 'completed';
                if (generation.status === 'final_video_ready' || generation.status === 'uploaded') return 'completed';
                if (generation.status === 'video_merged') return 'active';
                return 'pending';
            default:
                return 'pending';
        }
    }, [generation]);

    // Update step statuses
    const updatedSteps = useMemo(() => BASE_STEPS.map(step => ({
        ...step,
        status: getStepStatus(step.id)
    })), [getStepStatus]);

    // Handle step navigation
    const handleStepClick = useCallback((stepId: string) => {
        const step = updatedSteps.find(s => s.id === stepId);
        if (step && (step.status === 'completed' || step.status === 'active')) {
            setCurrentStep(stepId);
        }
    }, [updatedSteps]);

    // Navigation functions
    const goToPreviousStep = useCallback(() => {
        const currentIndex = updatedSteps.findIndex(step => step.id === currentStep);
        if (currentIndex > 0) {
            const previousStep = updatedSteps[currentIndex - 1];
            if (previousStep.status === 'completed' || previousStep.status === 'active') {
                setCurrentStep(previousStep.id);
            }
        }
    }, [updatedSteps, currentStep]);

    const goToNextStep = useCallback(() => {
        const currentIndex = updatedSteps.findIndex(step => step.id === currentStep);
        if (currentIndex < updatedSteps.length - 1) {
            const nextStep = updatedSteps[currentIndex + 1];
            if (nextStep.status === 'completed' || nextStep.status === 'active') {
                setCurrentStep(nextStep.id);
            }
        }
    }, [updatedSteps, currentStep]);

    // Check if navigation buttons should be enabled
    const canGoPrevious = useCallback(() => {
        const currentIndex = updatedSteps.findIndex(step => step.id === currentStep);
        if (currentIndex <= 0) return false;
        const previousStep = updatedSteps[currentIndex - 1];
        return previousStep.status === 'completed' || previousStep.status === 'active';
    }, [updatedSteps, currentStep]);

    const canGoNext = useCallback(() => {
        const currentIndex = updatedSteps.findIndex(step => step.id === currentStep);
        if (currentIndex >= updatedSteps.length - 1) return false;
        const nextStep = updatedSteps[currentIndex + 1];
        return nextStep.status === 'completed' || nextStep.status === 'active';
    }, [updatedSteps, currentStep]);

    // Find the first step with status 'active' (the true in-progress step)
    const inProgressStepIndex = updatedSteps.findIndex(step => step.status === 'active');

    const renderStepContent = useCallback(() => {
        switch (currentStep) {
            case 'prompt':
                return <PromptStep generation={generation} />;
            case 'initialized':
                return <ScriptStep generation={generation} scriptGeneration={scriptGeneration} setGeneration={memoizedSetGeneration} />;
            case 'script_generated':
                return <AudioStep generation={generation} audioGeneration={audioGeneration} setGeneration={memoizedSetGeneration} />;
            case 'audio_generated':
                return <ClipProcessingStep generation={generation} keywordsGeneration={keywordsGeneration} clipsGeneration={clipsGeneration} setGeneration={memoizedSetGeneration} />;
            case 'clips_processed':
                return <MergeClipsStep generation={generation} concatenateClips={concatenateClips} setGeneration={memoizedSetGeneration} />;
            case 'video_merged':
                return <ApplySubtitlesStep generation={generation} applySubtitles={applySubtitles} setGeneration={memoizedSetGeneration} />;
            case 'final_video_ready':
                return <PreviewDownloadStep generation={generation} />;
            default:
                return <PromptStep generation={generation} />;
        }
    }, [currentStep, generation, scriptGeneration, audioGeneration, keywordsGeneration, clipsGeneration, concatenateClips, applySubtitles, memoizedSetGeneration]);

    if (detailLoading && !generation) {
        return <ShimmerLoader />
    }

    return (
        <div className="flex h-full">
            {/* Left Section - 60% width */}
            <div className={`flex-1 p-8 ${isRightSectionCollapsed ? 'mr-16' : 'mr-[400px]'} transition-all duration-300`}>
                <div className="h-full relative">
                    {/* Left section content */}


                    {/* Step content */}
                    <div className="bg-zinc-900 rounded-lg mb-32">
                        {renderStepContent()}

                        {/* Navigation buttons */}

                    </div>

                    <div className={`fixed bottom-0 px-4 transition-all duration-300 ${sidebarCollapsed ? 'left-10' : 'left-58'} ${isRightSectionCollapsed ? 'right-10' : 'right-[380px]'}`}>
                        <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-lg p-4 px-8 min-h-[93px]">
                            {/* Horizontal Timeline */}
                            <div className="flex justify-end items-center p-6 -mt-22 right-0 gap-2">
                                <div className="text-zinc-400 text-sm">
                                    Step {updatedSteps.findIndex(step => step.id === currentStep) + 1} of {updatedSteps.length}
                                </div>
                                <button
                                    onClick={goToPreviousStep}
                                    disabled={!canGoPrevious()}
                                    className={`rounded-full h-8 w-8 flex items-center gap-2 justify-center transition-colors ${canGoPrevious()
                                        ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        }`}
                                >
                                    <FiChevronLeft size={16} />

                                </button>
                                <button
                                    onClick={goToNextStep}
                                    disabled={!canGoNext()}
                                    className={`rounded-full h-8 w-8 flex items-center gap-2 justify-center transition-colors ${canGoNext()
                                        ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        }`}
                                >

                                    <FiChevronLeft size={16} className="rotate-180" />
                                </button>
                            </div>
                            <div className="flex items-center justify-center pt-3">
                                {updatedSteps.map((step, index) => (
                                    <React.Fragment key={step.id}>
                                        <div
                                            className="flex flex-col items-center justify-start cursor-pointer"
                                            onClick={() => handleStepClick(step.id)}
                                        >
                                            <div className={
                                                `w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300
                                                ${currentStep === step.id
                                                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white scale-110 shadow-lg'
                                                    : index === inProgressStepIndex
                                                        ? 'ring-1 ring-zinc-300 bg-zinc-700 text-zinc-300'
                                                        : step.status === 'completed'
                                                            ? 'bg-green-500 text-white hover:bg-green-600'
                                                            : step.status === 'error'
                                                                ? 'bg-red-500 text-white hover:bg-red-600'
                                                                : 'bg-zinc-700 text-zinc-400'}
                                                `
                                            }>
                                                {step.icon}
                                            </div>
                                            <div className="mt-2 text-center">
                                                <div className={`text-xs font-medium transition-colors duration-300
                                                    ${currentStep === step.id
                                                        ? 'text-blue-500 font-bold'
                                                        : index === inProgressStepIndex
                                                            ? 'text-zinc-300'
                                                            : step.status === 'completed'
                                                                ? 'text-green-400'
                                                                : step.status === 'error'
                                                                    ? 'text-red-400'
                                                                    : 'text-zinc-500'
                                                    }
                                                `}>
                                                    {step.title}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Connector Line */}
                                        {index < updatedSteps.length - 1 && (
                                            <div className="flex mx-2 relative justify-center items-start">
                                                <div className={`
                                                    h-[1px] transition-all duration-300 w-6
                                                    ${step.status === 'completed'
                                                        ? 'bg-green-500'
                                                        : 'bg-zinc-700'
                                                    }
                                                `} />
                                            </div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Section - Collapsible */}
            <div className={`fixed right-0 bottom-0 top-18 transition-all h-full bg-green-500 duration-300 ${isRightSectionCollapsed ? 'w-16' : 'w-[400px]'}`}>
                <div className={`bg-zinc-900 border-l border-zinc-800 py-6 pl-6  h-full relative`}>
                    <div className="flex justify-between items-center mb-4 pr-6">
                        {!isRightSectionCollapsed && (
                            <h2 className="text-md font-semibold flex justify-between items-center w-full text-white">
                                Preview and Edit
                                <button
                                    onClick={toggleRightSection}
                                    className="p-1 hover:bg-zinc-800 cursor-pointer transition-colors text-zinc-400 hover:text-white rounded-full"
                                    title="Collapse preview panel"
                                >
                                    <FiChevronLeft size={16} />
                                </button>
                            </h2>
                        )}
                        {isRightSectionCollapsed && (
                            <button
                                onClick={toggleRightSection}
                                className="p-1 hover:bg-zinc-800 cursor-pointer transition-colors text-zinc-400 hover:text-white rounded-full"
                                title="Expand preview panel"
                            >
                                <FiSettings size={16} />
                            </button>
                        )}
                    </div>

                    {!isRightSectionCollapsed && (
                        <div className="overflow-y-auto flex flex-col h-full pb-25">
                            {/* Right panel content can be added here */}
                            <div className="text-zinc-400 text-sm">
                                <p>The edit magic is almost ready! <br/>Just a few more days — <span className="text-gray-200">coming soon!</span></p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};