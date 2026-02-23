import React from 'react';
import { useLocalStorageLoading } from '../hooks/useLocalStorageLoading';

interface LocalStorageLoadingWrapperProps {
  children: React.ReactNode;
  loadingKey: string;
  loadingComponent?: React.ReactNode;
  expirationTime?: number;
  forceRefresh?: boolean;
  className?: string;
}

const DefaultLoadingComponent = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
    <span className="ml-3 text-zinc-400">Loading...</span>
  </div>
);

export const LocalStorageLoadingWrapper: React.FC<LocalStorageLoadingWrapperProps> = ({
  children,
  loadingKey,
  loadingComponent = <DefaultLoadingComponent />,
  expirationTime = 24 * 60 * 60 * 1000, // 24 hours
  forceRefresh = false,
  className = ''
}) => {
  const { isLoading, markAsLoaded } = useLocalStorageLoading({
    key: loadingKey,
    initialLoadingState: true,
    expirationTime,
    forceRefresh
  });

  // Mark as loaded when component mounts (for immediate content)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      markAsLoaded();
    }, 100); // Small delay to ensure smooth transition

    return () => clearTimeout(timer);
  }, [markAsLoaded]);

  if (isLoading) {
    return (
      <div className={className}>
        {loadingComponent}
      </div>
    );
  }

  return <>{children}</>;
};

// Higher-order component version for easier usage
export const withLocalStorageLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingKey: string,
  options: {
    loadingComponent?: React.ReactNode;
    expirationTime?: number;
    forceRefresh?: boolean;
  } = {}
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <LocalStorageLoadingWrapper
      loadingKey={loadingKey}
      loadingComponent={options.loadingComponent}
      expirationTime={options.expirationTime}
      forceRefresh={options.forceRefresh}
    >
      <Component {...props} />
    </LocalStorageLoadingWrapper>
  );

  WrappedComponent.displayName = `withLocalStorageLoading(${Component.displayName || Component.name})`;
  return WrappedComponent;
}; 