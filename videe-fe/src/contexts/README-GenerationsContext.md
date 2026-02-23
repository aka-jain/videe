# GenerationsContext - Centralized Generation Management

The `GenerationsContext` provides centralized state management for all video generations (histories) across the application.

## Features

### Core Generations State (Histories)
- `generations`: Array of all generation summaries from the API
- `isLoading`: Loading state for API operations
- `error`: Error state for failed operations
- `hasMore`: Whether there are more generations to load
- `lastEvaluatedKey`: Pagination key for loading more

### Generation Actions
- `fetchGenerations()`: Fetch generations from API
- `loadMore()`: Load more generations (pagination)
- `refreshGenerations()`: Refresh the generations list
- `getGenerationById(id)`: Get a specific generation by ID
- `getGenerationDetails(id)`: Get detailed generation data

### Video Generation Functionality
- `videoGenerationLoading`: Loading state for video generation
- `generateVideo()`: Start a new video generation
- `resetGeneration()`: Reset generation state

## Usage

### Basic Setup

The context is wrapped around your app in `layout.tsx`:

```tsx
import { GenerationsProvider } from "../contexts/GenerationsContext";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthWrapper>
          <RouteGuard>
            <GenerationsProvider>
              {children}
            </GenerationsProvider>
          </RouteGuard>
        </AuthWrapper>
      </body>
    </html>
  );
}
```

### Using the Context

```tsx
import { useGenerations } from '../contexts/GenerationsContext';

function MyComponent() {
  const {
    // Core generations state
    generations,
    isLoading,
    error,
    hasMore,
    
    // Generation actions
    fetchGenerations,
    loadMore,
    refreshGenerations,
    getGenerationById,
    
    // Video generation
    videoGenerationLoading,
    generateVideo,
  } = useGenerations();

  // Use the consolidated state and functions
  const handleCreateVideo = async () => {
    await generateVideo(
      "My video prompt",
      LanguageCode.English,
      VideoResolution['16:9'],
      false
    );
  };

  return (
    <div>
      {generations.map(gen => (
        <div key={gen.generationId}>{gen.prompt}</div>
      ))}
    </div>
  );
}
```

### Console Logging in Create/[id] Page

The create/[id] page automatically logs generation data from the context:

```tsx
// In create/[id]/page.tsx
useEffect(() => {
  console.log('=== GENERATIONS CONTEXT DATA ===');
  console.log('All generations from context:', generations);
  console.log('Current generationId:', generationId);
  
  const contextGeneration = getGenerationById(generationId);
  console.log('Generation from context by ID:', contextGeneration);
  
  console.log('=== END GENERATIONS CONTEXT DATA ===');
}, [generations, generationId, getGenerationById]);
```

## Migration from Old Hooks

### From useHistory:
```tsx
// Old way
const { history, loading, error, hasMore, refresh, loadMore } = useHistory({
  limit: 100,
  sortOrder: 'desc',
  autoRefresh: true,
});

// New way
const { 
  generations, 
  isLoading: loading, 
  error, 
  hasMore, 
  refreshGenerations: refresh, 
  loadMore 
} = useGenerations();
```

### From useVideoGeneration:
```tsx
// Old way
const { isLoading, generateVideo, resetGeneration } = useVideoGeneration({
  onSuccess: (generationId) => console.log('Success:', generationId),
  onError: (error) => console.error('Error:', error),
});

// New way
const { 
  videoGenerationLoading: isLoading, 
  generateVideo, 
  resetGeneration 
} = useGenerations();

// Call generateVideo with callbacks
await generateVideo(
  prompt,
  language,
  resolution,
  twoPhaseGeneration,
  (generationId) => console.log('Success:', generationId),
  (error) => console.error('Error:', error)
);
```

## Benefits

1. **Centralized State**: All generation data is managed in one place
2. **Consistent Data**: No more duplicate state between different hooks
3. **Better Performance**: Shared state reduces unnecessary re-renders
4. **Easier Testing**: Single context to mock for testing
5. **Simplified API**: One hook provides access to all generation functionality
6. **Real-time Updates**: All components see the same generation data

## State Persistence

The context automatically:
- Fetches generations from API on mount
- Maintains state across all components
- Handles loading and error states
- Provides real-time updates across the app

## Error Handling

All operations include proper error handling:
- Network errors are caught and stored in error states
- Failed operations don't break the app
- Error states can be used to show user-friendly messages
- Retry mechanisms are available for failed operations 