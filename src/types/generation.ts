import { LocaleCode, VoiceId } from "../config/languages";

export interface GenerationState {
    generationId: string;
    isInstantVideo: boolean;
    userId: string;
    initialParams: {
        prompt: string;
        options: {
            aspectRatio: string;
            languageCode: LocaleCode;
            voiceId: VoiceId;
            useFancyCaptions?: boolean;
            twoPhaseScriptGeneration?: boolean;
        };
    };
    script?: {
        content: string;
        mood: string;
        source?: 'generated' | 'user';
    };
    audio?: {
        audioUrl: string;
        speechMarks: any[];
        backgroundMusicUrl: string;
        duration: number;
        scriptContentUsed?: string;
        scriptSource?: 'project_script' | 'custom_for_audio';
    };
    keywords?: {
        clipTimings: Array<{
            keyword: string;
            keywordType: 'search' | 'stock';
            startTime: number;
            duration: number;
            sentenceText: string;
        }>;
        source?: 'generated' | 'user';
    };
    clips?: {
        processedClips: Array<{
            clip: string;
            keyword: string;
            start: number;
            duration: number;
            actualDuration: number;
        }>;
        clipTimingsUsed?: ClipTiming[];
        timingsSource?: 'from_keywords_step' | 'custom_for_clips_step';
    };
    baseVideo?: {
        mergedVideoUrl: string;
    };
    finalVideo?: {
        videoUrl: string;
    };
    youtube?: {
        videoId: string;
        videoUrl: string;
        uploadDate: string;
    };
    createdAt?: string;
    updatedAt?: string;
    title?: string;
    status?: 'initialized' | 'script_generated' | 'audio_generated' | 'keywords_generated' | 'clips_processed' | 'video_merged' | 'final_video_ready' | 'uploaded' | 'error';
}

export interface GenerationSummary {
    generationId: string;
    prompt: string;
    twoPhaseScriptGeneration: boolean;
    finalVideo?: {
        videoUrl: string;
    };
    isInstantVideo: boolean;
    title?: string;
    status?: string;
    createdAt: string;
    updatedAt: string;
    language: LocaleCode;
    voiceId: VoiceId;
    aspectRatio: string;
    hasVideo: boolean;
    hasYouTubeUpload: boolean;
}

export interface PaginationOptions {
    limit?: number;
    lastEvaluatedKey?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
    items: T[];
    lastEvaluatedKey?: string;
    hasMore: boolean;
    totalCount?: number;
}

export type ClipTiming = NonNullable<GenerationState['keywords']>['clipTimings'][number];