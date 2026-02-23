# ClipProcessingStep Component

## Overview

The `ClipProcessingStep` component is a combined step that handles both keyword generation and video clip processing in a single workflow. It automatically executes keyword generation first, then proceeds to clip generation once keywords are available.

## Features

- **Sequential Processing**: Automatically calls keyword generation API first, then clip generation API
- **Visual Progress**: Shows different phases (keywords extraction → video clips processing → completed)
- **Typing Effect**: Displays progress with animated typing effect for better UX
- **Error Handling**: Separate error handling for keywords and clips generation
- **State Management**: Updates generation state with both keywords and clips data
- **Visual Indicators**: Shows checkmarks and icons for completed phases

## Props

```typescript
interface ClipProcessingStepProps {
  generation: GenerationDetails | null;
  keywordsGeneration: UseStepResponseResult<KeywordsGenerationResponse, KeywordsGenerationParams> | null;
  clipsGeneration: UseStepResponseResult<ClipsGenerationResponse, ClipsGenerationParams> | null;
  setGeneration?: (generation: GenerationDetails | null) => void;
}
```

## Workflow

1. **Initialization**: Component checks if keywords are already generated
2. **Keywords Phase**: 
   - Calls `executeKeywords(generationId)` if no keywords exist
   - Updates generation state with keywords data
   - Shows keywords extraction progress
3. **Clips Phase**:
   - Automatically triggers after keywords are generated
   - Calls `executeClips(generationId)` 
   - Updates generation state with processed clips
   - Shows clips processing progress
4. **Completion**: Both phases complete and status is updated

## Usage

```tsx
import ClipProcessingStep from "@/components/studio/controlled/ClipProcessingStep";

// In your component
const { keywordsGeneration, clipsGeneration } = useAllGenerationSteps();

<ClipProcessingStep 
  generation={generation}
  keywordsGeneration={keywordsGeneration}
  clipsGeneration={clipsGeneration}
  setGeneration={setGeneration}
/>
```

## Integration

This component replaces the separate `KeywordsStep` and `ClipsStep` components in the controlled generation workflow, providing a more streamlined user experience by combining both operations into a single step.

## Dependencies

- `@/lib/videoGenieApi` - For API types and interfaces
- `@/hooks/useGenerationSteps` - For step execution hooks
- `@/components/Shimmers` - For loading animations
- `react-icons/fi` - For icons (FiTag, FiVideo, FiClock, FiCheck) 