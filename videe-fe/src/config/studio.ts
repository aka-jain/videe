/**
 * Studio module constants and configuration
 */

import { GenerationStatus } from '../lib/videoGenieApi';

// Video generation loader stages
export const LOADER_STAGES = [
  { id: 'script', label: 'Creating script...', icon: '📝' },
  { id: 'audio', label: 'Generating audio & background music...', icon: '🎤' },
  { id: 'keywords', label: 'Extracting keywords...', icon: '🔍' },
  { id: 'clips', label: 'Searching & processing clips...', icon: '🎬' },
  { id: 'concatenate', label: 'Merging clips with audio...', icon: '🎞️' },
  { id: 'subtitles', label: 'Applying subtitles...', icon: '💬' }
] as const;

// Map backend statuses to frontend stages
export const mapBackendStatusToStage = (status: GenerationStatus): string => {
  const statusMap: Record<GenerationStatus, string> = {
    'initialized': 'script',
    'script_generated': 'audio',
    'audio_generated': 'keywords',
    'keywords_generated': 'clips',
    'clips_processed': 'concatenate',
    'video_merged': 'subtitles',
    'final_video_ready': 'complete',
    'uploaded': 'complete',
    'error': 'error'
  };
  
  return statusMap[status] || 'script';
};

// Video templates for quick start
export const VIDEO_TEMPLATES = [
  {
    title: "Product Demo",
    description: "Showcase your product",
    prompt: "Create a professional product demo video showcasing the key features and benefits of [Product Name]. Include smooth transitions, clear call-to-action, and highlight the unique value proposition."
  },
  {
    title: "Educational Content",
    description: "Teach something new",
    prompt: "Create an educational video about [Topic]. Break down complex concepts into simple, engaging segments with visual aids, examples, and a clear learning progression."
  },
  {
    title: "Storytelling",
    description: "Tell a compelling story",
    prompt: "Create a storytelling video with a compelling narrative arc. Include emotional moments, character development, and a satisfying conclusion that resonates with the audience."
  },
  {
    title: "Social Media",
    description: "Perfect for social platforms",
    prompt: "Create a short, engaging social media video (15-60 seconds) that captures attention quickly, delivers value, and encourages engagement. Include trending elements and clear branding."
  }
] as const;

// Video resolution options
export const VIDEO_RESOLUTIONS = [
  { value: '16:9', label: '16:9 (Desktop)' },
  { value: '9:16', label: '9:16 (Mobile)' }
] as const;

export type VideoResolution = typeof VIDEO_RESOLUTIONS[number]['value'];

// Dashboard analytics data
export const ANALYTICS_DATA = [
  { title: 'Total Videos', value: '24', icon: 'FaVideo', color: 'text-blue-600' },
  { title: 'Total Views', value: '1,234', icon: 'FaEye', color: 'text-green-600' },
  { title: 'Downloads', value: '89', icon: 'FaDownload', color: 'text-purple-600' },
  { title: 'Avg Duration', value: '2:45', icon: 'FaClock', color: 'text-orange-600' },
] as const;

// Mock video data for dashboard
export const MOCK_VIDEOS = [
  { title: 'IRCTC Booking Guide', views: 156, date: '2 days ago', duration: '3:45', thumbnail: '/api/placeholder/120/68' },
  { title: 'Travel Tips Video', views: 89, date: '1 week ago', duration: '2:30', thumbnail: '/api/placeholder/120/68' },
  { title: 'Product Demo', views: 234, date: '2 weeks ago', duration: '4:15', thumbnail: '/api/placeholder/120/68' },
  { title: 'How to Use Features', views: 67, date: '3 weeks ago', duration: '1:55', thumbnail: '/api/placeholder/120/68' },
  { title: 'Tutorial Series Part 1', views: 189, date: '1 month ago', duration: '5:20', thumbnail: '/api/placeholder/120/68' },
] as const;

// UI constants
export const UI_CONSTANTS = {
  SIDEBAR_COLLAPSED_WIDTH: '16',
  SIDEBAR_EXPANDED_WIDTH: '56',
  VIDEO_OPTIONS_COLLAPSED_WIDTH: '16',
  VIDEO_OPTIONS_EXPANDED_WIDTH: '72',
  TRANSITION_DURATION: '300',
} as const;

// Generation status types
export const GENERATION_STATUS = {
  LOADING: 'loading',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type FrontendGenerationStatus = typeof GENERATION_STATUS[keyof typeof GENERATION_STATUS];

// Navigation options for sidebar
export const DASHBOARD_NAVIGATION = [
  { label: 'Analytics', icon: 'FaChartBar', href: '/studio/dashboard' },
  { label: 'Videos', icon: 'FaVideo', href: '/studio/videos' },
  { label: 'Video Tool', icon: 'FaTools', href: '/studio/tools' },
  { label: 'Community', icon: 'FaUsers', href: '/studio/community' },
] as const; 