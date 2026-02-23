export const VIDEO_GENIE_API_BASE_URL = process.env.NEXT_PUBLIC_VIDEO_GENIE_API_BASE_URL || 'http://localhost:3001';
// http://videog-video-qjrbb07zrdx8-1492106275.us-east-1.elb.amazonaws.com
export const VIDEO_GENIE_ENDPOINTS = {
  INIT_GENERATION: '/generation/init',
  GENERATE_VIDEO: '/generate-video',
  GENERATE_SCRIPT: (generationId: string) => `/generation/${generationId}/script`,
  GENERATE_AUDIO: (generationId: string) => `/generation/${generationId}/audio`,
  GENERATE_KEYWORDS: (generationId: string) => `/generation/${generationId}/keywords`,
  GENERATE_CLIPS: (generationId: string) => `/generation/${generationId}/clips`,
  CONCATENATE_CLIPS: (generationId: string) => `/generation/${generationId}/concatenate`,
  APPLY_SUBTITLES: (generationId: string) => `/generation/${generationId}/video/subtitles`,
  YOUTUBE_UPLOAD: (generationId: string) => `/generation/${generationId}/youtube-upload`,

  // History endpoints
  GET_USER_HISTORY: '/history',
  CLEAR_HISTORY: '/history',
  GET_GENERATION_DETAILS: (generationId: string) => `/history/${generationId}`,

  // Polly voices endpoint
  POLLY_VOICES: '/api/polly-voices',

  // Add more endpoints as needed
}; 