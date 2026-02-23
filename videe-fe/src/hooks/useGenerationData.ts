import { useGeneration } from '../contexts/GenerationContext';

export const useGenerationData = () => {
  const { history, loading, error, refresh, loadMore, hasMore } = useGeneration();

  // Filter generations by status
  const getGenerationsByStatus = (status: string) => {
    return history.filter(gen => gen.status === status);
  };

  // Get completed generations
  const getCompletedGenerations = () => {
    return history.filter(gen =>
      gen.status === 'final_video_ready' || gen.status === 'uploaded'
    );
  };

  // Get in-progress generations
  const getInProgressGenerations = () => {
    return history.filter(gen =>
      gen.status && !['final_video_ready', 'uploaded', 'error'].includes(gen.status)
    );
  };

  // Get error generations
  const getErrorGenerations = () => {
    return history.filter(gen => gen.status === 'error');
  };

  // Get recent generations (last N)
  const getRecentGenerations = (count: number = 5) => {
    return history.slice(0, count);
  };

  // Get generation by ID
  const getGenerationById = (generationId: string) => {
    return history.find(gen => gen.generationId === generationId);
  };

  // Get statistics
  const getStatistics = () => {
    const total = history.length;
    const completed = getCompletedGenerations().length;
    const inProgress = getInProgressGenerations().length;
    const errors = getErrorGenerations().length;

    return {
      total,
      completed,
      inProgress,
      errors,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      errorRate: total > 0 ? (errors / total) * 100 : 0
    };
  };

  // Search generations
  const searchGenerations = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return history.filter(gen =>
      gen.prompt.toLowerCase().includes(lowerQuery) ||
      gen.title?.toLowerCase().includes(lowerQuery) ||
      gen?.generationId?.toLowerCase().includes(lowerQuery)
    );
  };

  return {
    // Original context data
    history,
    loading,
    error,
    refresh,
    loadMore,
    hasMore,

    // Filtered data
    getGenerationsByStatus,
    getCompletedGenerations,
    getInProgressGenerations,
    getErrorGenerations,
    getRecentGenerations,
    getGenerationById,

    // Statistics
    getStatistics,

    // Search
    searchGenerations
  };
}; 