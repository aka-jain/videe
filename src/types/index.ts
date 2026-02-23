// Types for video generation

import { SpeechMarkType } from "aws-sdk/clients/polly";

export interface VideoMetadata {
    duration: number;
    aspectRatio: number;
}

export interface PexelsVideo {
    id: number;
    width: number;
    height: number;
    duration: number;
    video_files: {
        id: number;
        quality: string;
        file_type: string;
        width: number;
        height: number;
        link: string;
    }[];
}

export interface PexelsSearchResponse {
    videos: PexelsVideo[];
}

export interface JamendoTrack {
    id: string;
    name: string;
    audio: string;
    [key: string]: any;
}

export interface JamendoResponse {
    results: JamendoTrack[];
}

export interface VideoRequest {
    prompt: string;
    useFancyCaptions?: boolean;
    generationId?: string;
    aspectRatio?: string;
    twoPhaseScriptGeneration?: boolean; // If true, use two-phase script generation
}

export interface SpeechMark {
    type: SpeechMarkType;
    value: string;
    time: number;
    duration: number;
}

export interface YouTubeUploadRequest {
    oauthToken: string;
    title?: string;
    description?: string;
    tags?: string[] | string;
    privacyStatus?: 'public' | 'unlisted' | 'private';
}

export interface YouTubeDirectUploadRequest extends YouTubeUploadRequest {
    videoPath: string;
}

export interface YouTubeUploadResponse {
    success: boolean;
    videoId: string;
    url: string;
}

// Re-export subscription types
export * from './subscription';