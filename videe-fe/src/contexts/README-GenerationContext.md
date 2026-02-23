# Generation Context

The Generation Context provides centralized state management for video generation history and related functionality throughout the VIDEE application.

## Overview

The Generation Context replaces the previous `useHistory` hook and provides a more robust, centralized way to manage generation data with additional features like:

- Real-time status updates
- Generation management (add, remove, update)
- Automatic refresh capabilities
- Infinite scrolling support
- Error handling

## Usage

### Basic Usage

```tsx
import { useGeneration } from '../contexts/GenerationContext';

function MyComponent() {
  const { 
    history, 
    loading, 
    error, 
    hasMore, 
    refresh, 
    loadMore 
  } = useGeneration();

  // Use the data...
}
```

### Advanced Usage with useGenerationData Hook

For components that need filtered or processed data:

```tsx
import { useGenerationData } from '../hooks/useGenerationData';

function AnalyticsComponent() {
  const { 
    getStatistics, 
    getCompletedGenerations, 
    getRecentGenerations 
  } = useGenerationData();

  const stats = getStatistics();
  const recentVideos = getRecentGenerations(5);
  const completedVideos = getCompletedGenerations();

  // Use the processed data...
}
```

## Context Provider Setup

The Generation Provider is already set up in the studio layout:

```tsx
// In src/app/studio/layout.tsx
<GenerationProvider options={{ 
  limit: 100, 
  sortOrder: 'desc', 
  autoRefresh: true 
}}>
  {/* Your app components */}
</GenerationProvider>
```

## Available Methods

### Core Methods (from useGeneration)

- `history`: Array of generation summaries
- `loading`: Boolean indicating if data is being fetched
- `error`: String containing error message if any
- `hasMore`: Boolean indicating if more data can be loaded
- `refresh()`: Function to refresh the data
- `loadMore()`: Function to load more data (infinite scroll)
- `getGenerationDetails(generationId)`: Function to get detailed generation data from API
- `getGenerationById(generationId)`: Function to get generation from local state
- `updateGenerationStatus(generationId, status)`: Function to update generation status
- `addGeneration(generation)`: Function to add a new generation
- `removeGeneration(generationId)`: Function to remove a generation

### Utility Methods (from useGenerationData)

- `getGenerationsByStatus(status)`: Filter generations by status
- `getCompletedGenerations()`: Get all completed generations
- `getInProgressGenerations()`: Get all in-progress generations
- `getErrorGenerations()`: Get all error generations
- `getRecentGenerations(count)`: Get recent N generations
- `getGenerationById(generationId)`: Get specific generation by ID
- `getStatistics()`: Get calculated statistics
- `searchGenerations(query)`: Search generations by text

## Generation Summary Interface

```tsx
interface GenerationSummary {
  generationId: string;
  prompt: string;
  title?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  language: string;
  aspectRatio: string;
  hasVideo: boolean;
  hasYouTubeUpload: boolean;
}
```

## Status Values

- `initialized`: Generation has been initialized
- `script_generated`: Script has been generated
- `audio_generated`: Audio has been generated
- `keywords_generated`: Keywords have been generated
- `clips_processed`: Clips have been processed
- `video_merged`: Video has been merged
- `final_video_ready`: Final video is ready
- `uploaded`: Video has been uploaded
- `error`: An error occurred

## Migration from useHistory

If you were previously using the `useHistory` hook, simply replace:

```tsx
// Old
import { useHistory } from '../hooks/useHistory';
const { history, loading, error } = useHistory(options);

// New
import { useGeneration } from '../contexts/GenerationContext';
const { history, loading, error } = useGeneration();
```

The context automatically handles the options that were previously passed to the hook.

## Best Practices

1. **Use useGenerationData for filtered data**: Instead of filtering in components, use the utility methods
2. **Handle loading states**: Always check the loading state before rendering data
3. **Error handling**: Check for errors and provide user feedback
4. **Infinite scroll**: Use `loadMore()` and `hasMore` for pagination
5. **Real-time updates**: The context automatically refreshes data when autoRefresh is enabled

## Examples

### Dashboard Analytics
```tsx
const { getStatistics } = useGenerationData();
const stats = getStatistics();
// Use stats.total, stats.completed, etc.
```

### Video List with Search
```tsx
const { searchGenerations } = useGenerationData();
const filteredVideos = searchGenerations(searchQuery);
```

### Status Updates
```tsx
const { updateGenerationStatus } = useGeneration();
// Update status when generation progresses
updateGenerationStatus(generationId, 'script_generated');
```

### Get Specific Generation
```tsx
const { getGenerationById } = useGeneration();
// Get generation from local state (no API call)
const generation = getGenerationById('some-generation-id');
if (generation) {
  console.log('Generation found:', generation.title);
}
``` 