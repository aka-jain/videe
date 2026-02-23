import { LanguageConfig } from "../config/languages";

export interface PollyVoice {
    id: string;
    voiceId: string;
    region: string;
    languageCode: string;
    gender: 'Male' | 'Female';
    sampleText: string;
    voiceS3Object?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface VoiceSearchParams {
    languageCode?: string;
    gender?: 'Male' | 'Female';
    region?: string;
    isActive?: boolean;
}

export interface VoiceListResponse {
    success: boolean;
    languages: Record<string, LanguageConfig>;
    voices: PollyVoice[];
    total: number;
}

export interface VoiceResponse {
    success: boolean;
    voice?: PollyVoice;
    error?: string;
}

export interface LanguageMappingResponse {
    success: boolean;
    languages: Array<{
        code: string;
        displayName: string;
        availableVoices: number;
    }>;
} 