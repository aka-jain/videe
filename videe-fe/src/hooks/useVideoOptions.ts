import { useState } from 'react';
import { VideoResolution } from '../config/studio';
import { PollyVoice } from '../lib/videoGenieApi';

// Storage keys for localStorage
const STORAGE_KEYS = {
    RESOLUTION: 'videoGennie_selectedResolution',
    LANGUAGE: 'videoGennie_selectedLanguage',
    VOICE: 'videoGennie_selectedVoice',
    TWO_PHASE: 'videoGennie_twoPhaseGeneration',
} as const;

// Default values
const DEFAULT_VALUES = {
    resolution: '16:9' as VideoResolution,
    language: 'en-US',
    voice: undefined as PollyVoice | undefined,
    twoPhaseGeneration: false,
} as const;

interface UseVideoOptionsReturn {
    selectedResolution: VideoResolution;
    setSelectedResolution: (resolution: VideoResolution) => void;
    selectedLanguage: string;
    setSelectedLanguage: (language: string) => void;
    selectedVoice: PollyVoice | undefined;
    setSelectedVoice: (voice: PollyVoice | undefined) => void;
    twoPhaseGeneration: boolean;
    setTwoPhaseGeneration: (enabled: boolean) => void;
    resetToDefaults: () => void;
}

// Utility functions for localStorage operations
const getFromStorage = <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;

    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Error reading ${key} from localStorage:`, error);
        return defaultValue;
    }
};

const setToStorage = <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Error saving ${key} to localStorage:`, error);
    }
};

const removeFromStorage = (key: string): void => {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn(`Error removing ${key} from localStorage:`, error);
    }
};

export const useVideoOptions = (): UseVideoOptionsReturn => {
    // Initialize state with localStorage values or defaults
    const [selectedResolution, setSelectedResolutionState] = useState<VideoResolution>(
        () => getFromStorage(STORAGE_KEYS.RESOLUTION, DEFAULT_VALUES.resolution)
    );

    const [selectedLanguage, setSelectedLanguageState] = useState<string>(
        () => getFromStorage(STORAGE_KEYS.LANGUAGE, DEFAULT_VALUES.language)
    );

    const [selectedVoice, setSelectedVoiceState] = useState<PollyVoice | undefined>(
        () => getFromStorage(STORAGE_KEYS.VOICE, DEFAULT_VALUES.voice)
    );

    const [twoPhaseGeneration, setTwoPhaseGenerationState] = useState<boolean>(
        () => getFromStorage(STORAGE_KEYS.TWO_PHASE, DEFAULT_VALUES.twoPhaseGeneration)
    );

    // Wrapped setters that also save to localStorage
    const setSelectedResolution = (resolution: VideoResolution) => {
        setSelectedResolutionState(resolution);
        setToStorage(STORAGE_KEYS.RESOLUTION, resolution);
    };

    const setSelectedLanguage = (language: string) => {
        setSelectedLanguageState(language);
        setToStorage(STORAGE_KEYS.LANGUAGE, language);
    };

    const setSelectedVoice = (voice: PollyVoice | undefined) => {
        setSelectedVoiceState(voice);
        setToStorage(STORAGE_KEYS.VOICE, voice);
    };

    const setTwoPhaseGeneration = (enabled: boolean) => {
        setTwoPhaseGenerationState(enabled);
        setToStorage(STORAGE_KEYS.TWO_PHASE, enabled);
    };

    // Reset all options to defaults and clear localStorage
    const resetToDefaults = () => {
        setSelectedResolutionState(DEFAULT_VALUES.resolution);
        setSelectedLanguageState(DEFAULT_VALUES.language);
        setSelectedVoiceState(DEFAULT_VALUES.voice);
        setTwoPhaseGenerationState(DEFAULT_VALUES.twoPhaseGeneration);

        // Clear localStorage
        Object.values(STORAGE_KEYS).forEach(removeFromStorage);
    };

    return {
        selectedResolution,
        setSelectedResolution,
        selectedLanguage,
        setSelectedLanguage,
        selectedVoice,
        setSelectedVoice,
        twoPhaseGeneration,
        setTwoPhaseGeneration,
        resetToDefaults,
    };
}; 