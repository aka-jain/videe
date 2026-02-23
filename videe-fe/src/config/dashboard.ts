/**
 * Dashboard module constants and configuration
 */

// Dashboard navigation items
export const DASHBOARD_NAV_ITEMS = [
  { label: 'Overview', href: '/studio/dashboard', icon: 'FaChartBar' },
  { label: 'Videos', href: '/studio/videos', icon: 'FaVideo' },
  { label: 'Analytics', href: '/studio/analytics', icon: 'FaChartLine' },
  { label: 'Community', href: '/studio/community', icon: 'FaUsers' },
] as const;

// Quick action buttons
export const QUICK_ACTIONS = [
  { label: 'Create Video', href: '/studio/create', icon: 'FaPlus', variant: 'primary' },
  { label: 'Upload Media', href: '/studio/upload', icon: 'FaUpload', variant: 'secondary' },
  { label: 'Templates', href: '/studio/templates', icon: 'FaLayerGroup', variant: 'secondary' },
] as const;

// Chart data for growth visualization
export const GROWTH_CHART_DATA = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Video Views',
      data: [1200, 1900, 3000, 5000, 2000, 3000],
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    {
      label: 'Video Creations',
      data: [10, 15, 25, 30, 20, 35],
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
    }
  ]
} as const;

// Performance metrics
export const PERFORMANCE_METRICS = {
  engagement: {
    label: 'Engagement Rate',
    value: '4.2%',
    trend: '+0.8%',
    isPositive: true
  },
  retention: {
    label: 'Avg Watch Time',
    value: '2:45',
    trend: '+0:15',
    isPositive: true
  },
  reach: {
    label: 'Total Reach',
    value: '45.2K',
    trend: '+12.5%',
    isPositive: true
  }
} as const;

// Recent activity types
export const ACTIVITY_TYPES = {
  VIDEO_CREATED: 'video_created',
  VIDEO_PUBLISHED: 'video_published',
  COMMENT_RECEIVED: 'comment_received',
  LIKE_RECEIVED: 'like_received',
  SHARE_RECEIVED: 'share_received'
} as const;

// Mock recent activities
export const MOCK_ACTIVITIES = [
  {
    id: 1,
    type: ACTIVITY_TYPES.VIDEO_CREATED,
    title: 'New video created',
    description: 'Product Demo Video',
    timestamp: '2 hours ago',
    icon: 'FaVideo'
  },
  {
    id: 2,
    type: ACTIVITY_TYPES.LIKE_RECEIVED,
    title: 'New like received',
    description: 'Travel Tips Video got 5 new likes',
    timestamp: '4 hours ago',
    icon: 'FaHeart'
  },
  {
    id: 3,
    type: ACTIVITY_TYPES.COMMENT_RECEIVED,
    title: 'New comment received',
    description: 'IRCTC Booking Guide received a comment',
    timestamp: '6 hours ago',
    icon: 'FaComment'
  }
] as const;

// Dashboard page titles
export const PAGE_TITLES = {
  OVERVIEW: 'Analytics Dashboard',
  VIDEOS: 'Videos',
  ANALYTICS: 'Analytics',
  COMMUNITY: 'Community',
  CREATE: 'Create Video'
} as const;

// Filter options for videos
export const VIDEO_FILTERS = {
  STATUS: [
    { value: 'all', label: 'All Videos' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'processing', label: 'Processing' }
  ],
  SORT: [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'views', label: 'Most Views' },
    { value: 'likes', label: 'Most Likes' }
  ]
} as const; 