# LocalStorage-Based Loading System

This system provides a way to avoid showing loading screens on subsequent visits by storing loading states in localStorage with expiration times.

## Features

- **First-time only loading**: Shows loading screens only on first visit
- **Configurable expiration**: Set how long to remember that content has been loaded
- **Force refresh option**: Bypass localStorage check when needed
- **Multiple loading keys**: Different loading states for different components
- **Utility functions**: Clear all loading states or check specific states

## Basic Usage

### Using the Hook

```tsx
import { useLocalStorageLoading } from '../hooks/useLocalStorageLoading';

function MyComponent() {
  const { isLoading, markAsLoaded, isFirstTime } = useLocalStorageLoading({
    key: 'my_component_loading',
    initialLoadingState: true,
    expirationTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  useEffect(() => {
    if (isLoading) {
      // Do your loading logic here
      const timer = setTimeout(() => {
        markAsLoaded(); // Mark as loaded when done
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, markAsLoaded]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <div>Your content here</div>;
}
```

### Using the Wrapper Component

```tsx
import { LocalStorageLoadingWrapper } from '../components/LocalStorageLoadingWrapper';

function MyComponent() {
  return (
    <LocalStorageLoadingWrapper
      loadingKey="my_component_loading"
      expirationTime={24 * 60 * 60 * 1000}
    >
      <div>Your content here</div>
    </LocalStorageLoadingWrapper>
  );
}
```

### Using Higher-Order Component

```tsx
import { withLocalStorageLoading } from '../components/LocalStorageLoadingWrapper';

function MyComponent() {
  return <div>Your content here</div>;
}

export default withLocalStorageLoading(MyComponent, 'my_component_loading', {
  expirationTime: 24 * 60 * 60 * 1000,
  loadingComponent: <div>Custom loading...</div>
});
```

## Hook API

### useLocalStorageLoading(options)

#### Options
- `key` (string): Unique identifier for this loading state
- `initialLoadingState` (boolean, optional): Initial loading state (default: true)
- `expirationTime` (number, optional): How long to remember loaded state in milliseconds (default: 24 hours)
- `forceRefresh` (boolean, optional): Bypass localStorage check (default: false)

#### Returns
- `isLoading` (boolean): Current loading state
- `setIsLoading` (function): Set loading state manually
- `markAsLoaded` (function): Mark as loaded and store in localStorage
- `resetLoading` (function): Reset loading state and clear localStorage
- `isFirstTime` (boolean): Whether this is the first time loading

## Utility Functions

### clearAllLoadingStates()
Clear all localStorage-based loading states.

```tsx
import { clearAllLoadingStates } from '../hooks/useLocalStorageLoading';

// Clear all loading states (useful for logout or reset)
clearAllLoadingStates();
```

### getLoadingState(key)
Check if a specific loading state should show loading.

```tsx
import { getLoadingState } from '../hooks/useLocalStorageLoading';

const shouldShowLoading = getLoadingState('my_component_loading');
```

## Implementation Examples

### Home Page Animations
```tsx
// Only show loading animations on first visit
const { isLoading, markAsLoaded } = useLocalStorageLoading({
  key: 'home_page_animations',
  expirationTime: 24 * 60 * 60 * 1000,
});

useEffect(() => {
  if (isLoading) {
    // Run your animations
    const timer = setTimeout(() => {
      markAsLoaded();
    }, 4000);
    return () => clearTimeout(timer);
  }
}, [isLoading, markAsLoaded]);
```

### Route Guard Setup
```tsx
// Avoid showing "Setting up..." screen on subsequent visits
const { isLoading: setupLoading, markAsLoaded } = useLocalStorageLoading({
  key: 'route_guard_setup',
  expirationTime: 24 * 60 * 60 * 1000,
});

useEffect(() => {
  if (!loading && shouldRender) {
    const timer = setTimeout(() => {
      markAsLoaded();
    }, 500);
    return () => clearTimeout(timer);
  }
}, [loading, shouldRender, markAsLoaded]);
```

### Component-Specific Loading
```tsx
// Different loading states for different components
const { isLoading: sidebarLoading } = useLocalStorageLoading({
  key: 'sidebar_loading',
  expirationTime: 60 * 60 * 1000, // 1 hour
});

const { isLoading: dashboardLoading } = useLocalStorageLoading({
  key: 'dashboard_loading',
  expirationTime: 12 * 60 * 60 * 1000, // 12 hours
});
```

## Best Practices

1. **Use descriptive keys**: Make keys specific to the component or feature
2. **Set appropriate expiration times**: 
   - Short for frequently changing content (1 hour)
   - Medium for semi-static content (12 hours)
   - Long for static content (24 hours)
3. **Clear states on logout**: Use `clearAllLoadingStates()` when user logs out
4. **Force refresh when needed**: Use `forceRefresh: true` for important updates
5. **Handle SSR**: The system automatically handles server-side rendering

## Storage Format

The system stores data in localStorage with these keys:
- `loading_{key}`: Boolean indicating if content has been loaded
- `loading_timestamp_{key}`: Timestamp when content was last loaded

Example:
```
loading_home_page_animations: "true"
loading_timestamp_home_page_animations: "1703123456789"
``` 