"use client";

import React from "react";
import { ChevronLeft, Settings, RotateCcw } from "lucide-react";
import { VIDEO_RESOLUTIONS, VideoResolution } from "../../config/studio";
import { PollyVoice } from "../../lib/videoGenieApi";
import LanguageVoiceSelector from "./LanguageVoiceSelector";

interface VideoOptionsSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  selectedResolution: VideoResolution;
  onResolutionChange: (resolution: VideoResolution) => void;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  selectedVoice?: PollyVoice;
  onVoiceChange: (voice: PollyVoice) => void;
  twoPhaseGeneration: boolean;
  onTwoPhaseGenerationChange: (enabled: boolean) => void;
  onResetToDefaults?: () => void;
  isLoading?: boolean;
}

export default function VideoOptionsSidebar({
  isCollapsed,
  onToggle,
  selectedResolution,
  onResolutionChange,
  selectedLanguage,
  onLanguageChange,
  selectedVoice,
  onVoiceChange,
  twoPhaseGeneration,
  onTwoPhaseGenerationChange,
  onResetToDefaults,
  isLoading = false,
}: VideoOptionsSidebarProps) {
  return (
    <div
      className={`fixed right-0 top-6 ${
        isCollapsed ? "w-16" : "w-72"
      } mt-[48px] h-[100vh] transition-all duration-300`}
    >
      <div
        className={`bg-zinc-900 ${
          isCollapsed ? "" : "border-l border-zinc-800"
        } p-6 space-y-6 h-full overflow-y-auto relative`}
      >
        <div className="flex justify-between items-center">
          {!isCollapsed && (
            <h3 className="text-lg font-medium flex justify-between items-center w-full text-white flex items-center">
              Video Settings
              <button
                onClick={onToggle}
                className="p-1 hover:bg-zinc-800 cursor-pointer transition-colors text-zinc-400 hover:text-white rounded-full"
                title="Collapse video options"
              >
                <ChevronLeft size={16} />
              </button>
            </h3>
          )}
          {isCollapsed && (
            <button
              onClick={onToggle}
              className="p-1 hover:bg-zinc-800 cursor-pointer transition-colors text-zinc-400 hover:text-white rounded-full"
              title="Expand video options"
            >
              <Settings size={16} />
            </button>
          )}
        </div>

        {!isCollapsed && (
          <>
            {/* Video duration (fixed setting) */}
            <div className="text-xs text-zinc-500 pb-1 border-b border-zinc-800">
              Video duration: <span className="text-zinc-400 font-medium">20 seconds max</span>
            </div>

            {/* Resolution Selection */}
            <div className="">
              <div className="text-sm font-medium text-zinc-300 mb-1">
                Resolution
              </div>
              <div className="flex flex-col space-y-2">
                {VIDEO_RESOLUTIONS.map((resolution) => (
                  <button
                    key={resolution.value}
                    onClick={() => onResolutionChange(resolution.value)}
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-lg border cursor-pointer transition-all duration-200 text-left ${
                      selectedResolution === resolution.value
                        ? "border-blue-500 bg-blue-500 bg-opacity-20 text-white"
                        : "border-zinc-600 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-700"
                    } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {resolution.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language and Voice Selection */}
            <LanguageVoiceSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={onLanguageChange}
              selectedVoice={selectedVoice}
              onVoiceChange={onVoiceChange}
              isLoading={isLoading}
            />

            {/* Two-Phase Generation Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-300">
                  Two-Phase Generation
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Uses web search for more accurate content
                </div>
              </div>
              <button
                onClick={() => onTwoPhaseGenerationChange(!twoPhaseGeneration)}
                disabled={isLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  twoPhaseGeneration ? "bg-blue-500" : "bg-zinc-600"
                } ${
                  isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    twoPhaseGeneration ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Reset Button */}
            {/* {onResetToDefaults && (
              <div className="pt-4 border-t border-zinc-800">
                <button
                  onClick={onResetToDefaults}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-700 transition-all duration-200 ${
                    isLoading
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                  title="Reset all settings to default values"
                >
                  <RotateCcw size={16} />
                  <span className="text-sm">Reset to Defaults</span>
                </button>
              </div>
            )} */}
          </>
        )}
      </div>
    </div>
  );
}
