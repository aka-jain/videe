"use client";

import React, { useState, useEffect } from "react";
import { Plus, HelpCircle, Play, Edit3 } from "lucide-react";
import Link from "next/link";
import { useSidebar } from "../../../contexts/SidebarContext";
import { useVideoOptions as useVideoOptionsContext } from "../../../contexts/VideoOptionsContext";
import { VideoResolution } from "../../../config/studio";
import { useVideoGeneration } from "../../../hooks/useVideoGeneration";
import { useVideoOptions } from "../../../hooks/useVideoOptions";
import { useModal } from "../../../contexts/ModalContext";
import VideoGenerationLoader from "../../../components/studio/VideoGenerationLoader";
import VideoTemplates from "../../../components/studio/VideoTemplates";
import VideoOptionsSidebar from "../../../components/studio/VideoOptionsSidebar";
import PromptInput from "../../../components/studio/PromptInput";
import MemoriesSection from "../../../components/studio/MemoriesSection";
import Button from "../../../components/Button";
import { LocaleCode } from "@/config/languages";
import { PollyVoice } from "../../../lib/videoGenieApi";

export default function CreateVideo() {
  const [inputValue, setInputValue] = useState("");

  // Load userPrompt from localStorage on component mount
  useEffect(() => {
    const storedPrompt = localStorage.getItem('userPrompt');
    if (storedPrompt) {
      setInputValue(storedPrompt);
      localStorage.removeItem('userPrompt'); // Clear after loading
    }
  }, []);

  // Use the persistent video options hook
  const {
    selectedResolution,
    setSelectedResolution,
    selectedLanguage,
    setSelectedLanguage,
    selectedVoice,
    setSelectedVoice,
    twoPhaseGeneration,
    setTwoPhaseGeneration,
    resetToDefaults,
  } = useVideoOptions();

  const { sidebarCollapsed } = useSidebar();
  const { videoOptionsCollapsed, toggleVideoOptions } =
    useVideoOptionsContext();
  const { openModal, closeModal } = useModal();

  const { isLoading, generateVideo, resetGeneration } = useVideoGeneration();

  const handleTemplateSelect = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    openModal({
      id: "creation-mode-modal",
      title: "Choose Creation Mode",
      size: "md",
      closeOnOverlayClick: true,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-zinc-300 mb-4">
              How would you like to create your video?
            </p>
            <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
              <p className="text-zinc-400 text-sm font-medium mb-2">
                Your Prompt:
              </p>
              <p className="text-white text-sm italic">"{inputValue}"</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                closeModal();
                handleCreateInstantVideo();
              }}
              variant="primary"
              fullWidth
              className="flex items-center justify-center space-x-3 h-12"
            >
              <Play size={20} />
              <span>Create Instant Video</span>
            </Button>

            <Button
              onClick={() => {
                closeModal();
                handleCreateInEditMode();
              }}
              variant="outline"
              fullWidth
              className="flex items-center justify-center space-x-3 h-12"
            >
              <Edit3 size={20} />
              <span>Step-by-Step Control</span>
            </Button>
          </div>

          <div className="text-center">
            <p className="text-zinc-500 text-xs">
              <strong>Instant Video:</strong> Generate video directly with
              current settings
              <br />
              <strong>Step-by-Step Control:</strong> Edit and control every step
              of video creation
            </p>
          </div>
        </div>
      ),
    });
  };

  const handleCreateInstantVideo = () => {
    generateVideo({
      prompt: inputValue,
      language: selectedLanguage as LocaleCode,
      resolution: selectedResolution,
      twoPhaseGeneration: twoPhaseGeneration,
      isInstantVideo: true,
      voiceId: selectedVoice?.voiceId,
    });
  };

  const handleCreateInEditMode = () => {
    // For now, we'll also generate the video but you can modify this
    // to navigate to an edit page or show additional options
    generateVideo({
      prompt: inputValue,
      language: selectedLanguage as LocaleCode,
      resolution: selectedResolution,
      twoPhaseGeneration: twoPhaseGeneration,
      isInstantVideo: false,
      voiceId: selectedVoice?.voiceId,
    });

    // TODO: Implement edit mode functionality
    // This could navigate to a different page or show additional modal options
    console.log("Edit mode selected - implement custom logic here");
  };

  const handleShowHelp = () => {
    openModal({
      id: "help-modal",
      title: "How to Create Videos",
      size: "lg",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-white">Getting Started</h3>
            <p className="text-zinc-300">
              Create amazing videos by following these simple steps:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-zinc-300">
              <li>Enter a detailed prompt describing your video</li>
              <li>Choose your preferred language and resolution</li>
              <li>Select from our pre-made templates or write your own</li>
              <li>Click "Generate Video" to start the creation process</li>
            </ol>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-medium text-white">
              Tips for Better Results
            </h3>
            <ul className="list-disc list-inside space-y-2 text-zinc-300">
              <li>Be specific about the style, mood, and content you want</li>
              <li>Include details about camera angles and transitions</li>
              <li>Mention any specific colors or visual elements</li>
              <li>Use clear, descriptive language</li>
            </ul>
          </div>

          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <p className="text-blue-300 text-sm">
              <strong>Pro Tip:</strong> Enable two-phase generation for higher
              quality results, though it may take longer to complete.
            </p>
          </div>
        </div>
      ),
    });
  };

  return (
    <div className="flex h-full max-w-5xl w-full mx-auto p-6 text-white px-20">
      {/* Main Content Area */}
      <div
        className={`flex-1 space-y-8 px-20 flex w-full flex-col items-center justify-center transition-all duration-300 ${
          sidebarCollapsed
            ? videoOptionsCollapsed
              ? "m-0 "
              : "m-0 transform translate-x-[-138px]"
            : videoOptionsCollapsed
            ? "m-0"
            : "m-0 transform translate-x-[-138px]"
        }`}
      >
        <div className="flex items-center justify-center space-x-4">
          <h1 className="text-3xl text-zinc-300">
            Let's Build Today's Video Story!
          </h1>
          <button
            onClick={handleShowHelp}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors duration-200"
            aria-label="Help"
          >
            <HelpCircle size={20} />
          </button>
        </div>

        <PromptInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />

        <VideoTemplates
          onTemplateSelect={handleTemplateSelect}
          isLoading={isLoading}
        />

        <MemoriesSection />
      </div>

      {/* Video Options Sidebar */}
      <VideoOptionsSidebar
        isCollapsed={videoOptionsCollapsed}
        onToggle={toggleVideoOptions}
        selectedResolution={selectedResolution}
        onResolutionChange={setSelectedResolution}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        selectedVoice={selectedVoice}
        onVoiceChange={setSelectedVoice}
        twoPhaseGeneration={twoPhaseGeneration}
        onTwoPhaseGenerationChange={setTwoPhaseGeneration}
        onResetToDefaults={resetToDefaults}
        isLoading={isLoading}
      />
    </div>
  );
}
