"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { useVoices } from "../../hooks/useVoices";
import { PollyVoice } from "../../lib/videoGenieApi";

interface LanguageVoiceSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  selectedVoice?: PollyVoice;
  onVoiceChange: (voice: PollyVoice) => void;
  isLoading?: boolean;
}

export default function LanguageVoiceSelector({
  selectedLanguage,
  onLanguageChange,
  selectedVoice,
  onVoiceChange,
  isLoading = false,
}: LanguageVoiceSelectorProps) {
  const {
    languages,
    availableLanguageCodes,
    getVoicesByLanguage,
    loading: voicesLoading,
    error: voicesError,
  } = useVoices();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = React.useState<string | null>(
    null
  );
  const [audioLoading, setAudioLoading] = React.useState<string | null>(null);

  const availableVoices = useMemo(() => {
    return selectedLanguage ? getVoicesByLanguage(selectedLanguage) : [];
  }, [selectedLanguage, getVoicesByLanguage]);

  // Auto-select first voice when language changes
  useEffect(() => {
    if (
      availableVoices.length > 0 &&
      (!selectedVoice || selectedVoice.languageCode !== selectedLanguage)
    ) {
      onVoiceChange(availableVoices[0]);
    }
  }, [selectedLanguage, availableVoices, selectedVoice, onVoiceChange]);

  const handlePlayVoice = async (voice: PollyVoice) => {
    if (!voice.voiceS3Object) return;

    try {
      if (playingVoiceId === voice.voiceId) {
        // Stop current audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setPlayingVoiceId(null);
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      setAudioLoading(voice.voiceId);
      setPlayingVoiceId(null);

      // Create new audio element
      audioRef.current = new Audio(voice.voiceS3Object);

      audioRef.current.onloadstart = () => {
        setAudioLoading(voice.voiceId);
      };

      audioRef.current.oncanplay = () => {
        setAudioLoading(null);
        setPlayingVoiceId(voice.voiceId);
      };

      audioRef.current.onended = () => {
        setPlayingVoiceId(null);
        setAudioLoading(null);
      };

      audioRef.current.onerror = () => {
        setPlayingVoiceId(null);
        setAudioLoading(null);
        console.error("Error playing voice sample");
      };

      await audioRef.current.play();
    } catch (error) {
      console.error("Error playing voice sample:", error);
      setPlayingVoiceId(null);
      setAudioLoading(null);
    }
  };

  return (
    <>
      {/* Language Selection */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-zinc-300 mb-1">Language</div>
        {voicesLoading ? (
          <div className="px-4 py-2 rounded-lg border bg-zinc-700 border-zinc-600 text-zinc-400">
            Loading languages...
          </div>
        ) : voicesError ? (
          <div className="px-4 py-2 rounded-lg border bg-red-900 border-red-600 text-red-300 text-sm">
            Error loading languages: {voicesError}
          </div>
        ) : (
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={isLoading || voicesLoading}
            className={`w-full px-4 py-2 rounded-lg border bg-zinc-700 border-zinc-600 text-white focus:outline-none focus:border-blue-500 transition-colors ${
              isLoading || voicesLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {availableLanguageCodes.map((langCode) => (
              <option key={langCode} value={langCode}>
                {languages[langCode]?.displayName || langCode}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Voice Selection */}
      {selectedLanguage && availableVoices.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-zinc-300 mb-1">Voice</div>
          <div className="space-y-2">
            {availableVoices.map((voice) => (
              <div
                key={voice.id}
                onClick={() => onVoiceChange(voice)}
                className={`border rounded-lg p-3 transition-all duration-200 cursor-pointer ${
                  selectedVoice?.id === voice.id
                    ? "border-blue-500 bg-blue-500 bg-opacity-10 text-white"
                    : "border-zinc-600 hover:border-zinc-500 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                } ${
                  isLoading || voicesLoading
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div
                      className={`text-sm font-medium ${
                        selectedVoice?.id === voice.id
                          ? "text-white"
                          : "text-white"
                      }`}
                    >
                      {voice.voiceId}
                    </div>
                    <div
                      className={`text-xs ${
                        selectedVoice?.id === voice.id
                          ? "text-blue-200"
                          : "text-zinc-400"
                      }`}
                    >
                      {voice.gender}
                    </div>
                  </div>

                  {voice.voiceS3Object && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card selection when clicking play button
                        handlePlayVoice(voice);
                      }}
                      disabled={
                        isLoading ||
                        voicesLoading ||
                        audioLoading === voice.voiceId
                      }
                      className={`ml-2 p-1.5 rounded-full transition-colors ${
                        playingVoiceId === voice.voiceId
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : audioLoading === voice.voiceId
                          ? "bg-zinc-600 text-zinc-400"
                          : selectedVoice?.id === voice.id
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white"
                      } ${
                        isLoading || voicesLoading
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                      title={
                        playingVoiceId === voice.voiceId
                          ? "Stop preview"
                          : "Preview voice"
                      }
                    >
                      {audioLoading === voice.voiceId ? (
                        <div className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin" />
                      ) : playingVoiceId === voice.voiceId ? (
                        <Pause size={12} />
                      ) : (
                        <Play size={12} />
                      )}
                    </button>
                  )}
                </div>

                {voice.sampleText && (
                  <div
                    className={`mt-2 text-xs italic line-clamp-2 ${
                      selectedVoice?.id === voice.id
                        ? "text-blue-100"
                        : "text-zinc-500"
                    }`}
                  >
                    "{voice.sampleText}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
