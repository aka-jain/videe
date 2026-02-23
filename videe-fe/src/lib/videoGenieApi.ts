import axiosInstance from './axiosInstance';
import { VIDEO_GENIE_ENDPOINTS } from './apiEndpoints';
import { LocaleCode } from '@/config/languages';

export interface InitGenerationParams {
  prompt: string;
  options: {
    aspectRatio: string;
    languageCode: LocaleCode;
    useFancyCaptions?: boolean;
    twoPhaseScriptGeneration: boolean;
    voiceId: string;
  };
  isInstantVideo?: boolean;
}

export interface InitGenerationResponse {
  generationId: string;
}

export interface GenerateVideoParams {
  prompt: string;
  language?: string;
  options?: {
    aspectRatio?: string;
    useFancyCaptions?: boolean;
    twoPhaseScriptGeneration?: boolean;
  };
  generationId?: string;
}

export interface GenerateVideoResponse {
  videoId: string;
  status: string;
  message?: string;
}

// New status types matching backend
export type GenerationStatus =
  | 'initialized'
  | 'script_generated'
  | 'audio_generated'
  | 'keywords_generated'
  | 'clips_processed'
  | 'video_merged'
  | 'final_video_ready'
  | 'uploaded'
  | 'error';

export interface GenerationSummary {
  generationId: string;
  status: GenerationStatus;
  createdAt: string;
  updatedAt: string;
  language?: string;
  aspectRatio: string;
  hasVideo: boolean;
  hasYouTubeUpload: boolean;
  isInstantVideo: boolean;
  prompt: string;
  title: string;
  finalVideo?: {
    videoUrl: string;
  };
}

// New interface for generation details from history API
export interface GenerationDetails {
  id: string;
  prompt: string;
  status: GenerationStatus;
  createdAt: string;
  updatedAt: string;
  language?: string;
  options?: {
    aspectRatio?: string;
    useFancyCaptions?: boolean;
    twoPhaseScriptGeneration?: boolean;
    voiceId?: string;
    languageCode?: string;
  };
  // Video URLs
  finalVideo?: {
    videoUrl: string;
  };
  baseVideo?: {
    mergedVideoUrl: string;
  };
  // Script data
  script?: {
    content: string;
    mood: string;
    source: string;
  };
  // Audio data
  audio?: {
    audioUrl: string;
    backgroundMusicUrl: string;
    speechMarks: Array<{
      start: number;
      end: number;
      time: number;
      type: string;
      value: string;
    }>;
  };
  // Clips data
  clips?: {
    processedClips: Array<{
      start: number;
      duration: number;
      actualDuration: number;
      keyword: string;
      clip: string;
    }>;
  };
  // Keywords data
  keywords?: {
    clipTimings: Array<{
      startTime: number;
      duration: number;
      keyword: string;
      keywordType: string;
      sentenceText: string;
    }>;
  };
  // Initial parameters
  initialParams?: {
    prompt: string;
    language: string;
    options: {
      aspectRatio: string;
      useFancyCaptions: boolean;
      twoPhaseScriptGeneration: boolean;
      voiceId: string;
      languageCode: string;
    };
  };
  // Other fields
  generationId?: string;
  userId?: string;
  title?: string;
}

// Interface for API response wrapper
export interface GenerationDetailsResponse {
  success: boolean;
  generation: GenerationDetails;
}

// Interface for history list response
export interface HistoryResponse {
  generations: GenerationSummary[];
}

// Step-specific interfaces
export interface ScriptGenerationParams {
  userScript?: string;
  /** Memory strings from Mem0 search (used to personalize script generation) */
  memories?: string[];
}

export interface ScriptGenerationResponse {
  script: string;
  mood: string;
}

export interface AudioGenerationParams {
  editedScript?: string;
  /** Memory strings for audio/caption preferences (e.g. from Mem0 search) */
  memories?: string[];
}

export interface SpeechMark {
  time: number;
  type: string;
  start: number;
  end: number;
  value: string;
}

export interface AudioGenerationResponse {
  audioFile: string;
  speechMarks: SpeechMark[];
  backgroundMusic: string;
}

export interface KeywordsGenerationParams {
  userClipTimings?: Array<{
    keyword: string;
    keywordType: 'search' | 'stock';
    startTime: number;
    duration: number;
    sentenceText: string;
  }>;
}

export interface KeywordsGenerationResponse {
  clipTimings: Array<{
    keyword: string;
    keywordType: 'search' | 'stock';
    startTime: number;
    duration: number;
    sentenceText: string;
  }>;
}

export interface ClipsGenerationParams {
  overrideClipTimings?: Array<{
    keyword: string;
    keywordType: 'search' | 'stock';
    startTime: number;
    duration: number;
    sentenceText: string;
  }>;
}

export interface ClipsGenerationResponse {
  processedClips: Array<{
    clip: string;
    keyword: string;
    start: number;
    duration: number;
    actualDuration: number;
  }>;
}

export interface ConcatenateResponse {
  videoUrl: string;
}

export interface ApplySubtitlesParams {
  /** Memory strings for caption/subtitle styling preferences (e.g. from Mem0 search) */
  memories?: string[];
}

export interface SubtitlesResponse {
  finalVideoUrl: string;
}

// Polly Voice interfaces
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

export interface LanguageConfig {
  displayName: string;
  subtitleFonts: string[];
  fontEncoding: number;
}

export interface VoiceListResponse {
  success: boolean;
  voices: PollyVoice[];
  languages: Record<string, LanguageConfig>;
  total: number;
}

// API functions
export const initGeneration = async (params: InitGenerationParams): Promise<InitGenerationResponse> => {
  const response = await axiosInstance.post(VIDEO_GENIE_ENDPOINTS.INIT_GENERATION, params);
  return response.data;
};

export const startVideoGeneration = async (params: GenerateVideoParams): Promise<GenerateVideoResponse> => {
  const response = await axiosInstance.post(VIDEO_GENIE_ENDPOINTS.GENERATE_VIDEO, params);
  return response.data;
};

export const getGenerationDetails = async (generationId: string): Promise<GenerationDetails> => {
  const response = await axiosInstance.get<GenerationDetailsResponse>(VIDEO_GENIE_ENDPOINTS.GET_GENERATION_DETAILS(generationId));

  if (!response.data.success) {
    throw new Error('Failed to fetch generation details');
  }

  // Map the response to match our interface
  const generation = response.data.generation;
  return {
    id: generation.generationId || generationId,
    prompt: generation.initialParams?.prompt || generation.title || '',
    status: generation.status,
    createdAt: generation.createdAt,
    updatedAt: generation.updatedAt,
    language: generation.initialParams?.language,
    options: generation.initialParams?.options,
    finalVideo: generation.finalVideo,
    baseVideo: generation.baseVideo,
    script: generation.script,
    audio: generation.audio,
    clips: generation.clips,
    keywords: generation.keywords,
    initialParams: generation.initialParams,
    generationId: generation.generationId,
    userId: generation.userId,
    title: generation.title,
  };
};

export const getUserHistory = async (): Promise<HistoryResponse> => {
  const response = await axiosInstance.get(VIDEO_GENIE_ENDPOINTS.GET_USER_HISTORY);
  return response.data;
};

// Step functions
export const generateScript = async (generationId: string, params?: ScriptGenerationParams): Promise<ScriptGenerationResponse> => {
  const response = await axiosInstance.post(VIDEO_GENIE_ENDPOINTS.GENERATE_SCRIPT(generationId), params || {});
  return response.data;
};

export const generateAudio = async (generationId: string, params?: AudioGenerationParams): Promise<AudioGenerationResponse> => {
  const response = await axiosInstance.post(VIDEO_GENIE_ENDPOINTS.GENERATE_AUDIO(generationId), params || {});
  return response.data;
};

export const generateKeywords = async (generationId: string, params?: KeywordsGenerationParams): Promise<KeywordsGenerationResponse> => {
  const response = await axiosInstance.post(VIDEO_GENIE_ENDPOINTS.GENERATE_KEYWORDS(generationId), params || {});
  return response.data;
};

export const generateClips = async (generationId: string, params?: ClipsGenerationParams): Promise<ClipsGenerationResponse> => {
  const response = await axiosInstance.post(VIDEO_GENIE_ENDPOINTS.GENERATE_CLIPS(generationId), params || {});
  return response.data;
};

export const concatenateClips = async (generationId: string): Promise<ConcatenateResponse> => {
  const response = await axiosInstance.post(VIDEO_GENIE_ENDPOINTS.CONCATENATE_CLIPS(generationId), {});
  return response.data;
};

export const applySubtitles = async (generationId: string, params?: ApplySubtitlesParams): Promise<SubtitlesResponse> => {
  const response = await axiosInstance.post(VIDEO_GENIE_ENDPOINTS.APPLY_SUBTITLES(generationId), params || {});
  return response.data;
};

export const fetchPollyVoices = async (): Promise<VoiceListResponse> => {
  const response = await axiosInstance.get(VIDEO_GENIE_ENDPOINTS.POLLY_VOICES);
  return response.data;
}; 