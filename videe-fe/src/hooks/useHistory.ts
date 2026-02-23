import { useState, useEffect } from 'react';
import axiosInstance from '../lib/axiosInstance';
import { VIDEO_GENIE_ENDPOINTS } from '../lib/apiEndpoints';

export interface GenerationSummary {
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
    isInstantVideo?: boolean;
    twoPhaseScriptGeneration?: boolean;
    finalVideo?: {
        videoUrl: string;
    };
}

export interface GenerationHistoryResponse {
    success: boolean;
    generations: GenerationSummary[];
    pagination: {
        hasMore: boolean;
        lastEvaluatedKey?: string;
        totalCount?: number;
    };
}

export interface UseHistoryOptions {
    limit?: number;
    sortOrder?: 'asc' | 'desc';
    autoRefresh?: boolean;
    refreshInterval?: number;
}

interface HistoryParams {
    limit: number;
    sortOrder: 'asc' | 'desc';
    lastKey?: string;
}

interface ApiError {
    response?: {
        data?: {
            error?: string;
        };
    };
    message?: string;
}

export const useHistory = (options: UseHistoryOptions = {}) => {
    const {
        limit = 20,
        sortOrder = 'desc',
        autoRefresh = false,
        refreshInterval = 10000 // 30 seconds
    } = options;

    const [history, setHistory] = useState<GenerationSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [lastEvaluatedKey, setLastEvaluatedKey] = useState<string | undefined>();

    const fetchHistory = async (append = false, lastKey?: string) => {
        try {
            setLoading(true);
            setError(null);

            const params: HistoryParams = {
                limit,
                sortOrder
            };

            if (lastKey) {
                params.lastKey = lastKey;
            }

            const response = await axiosInstance.get<GenerationHistoryResponse>(
                `${VIDEO_GENIE_ENDPOINTS.GET_USER_HISTORY}`,
                { params }
            );

            if (response.data.success) {
                const newGenerations = response.data.generations;

                if (append) {
                    setHistory(prev => [...prev, ...newGenerations]);
                } else {
                    setHistory(newGenerations);
                }

                setHasMore(response.data.pagination.hasMore);
                setLastEvaluatedKey(response.data.pagination.lastEvaluatedKey);
            }
        } catch (err: unknown) {
            console.error('Error fetching history:', err);
            const apiError = err as ApiError;
            const errorMessage = apiError.response?.data?.error || apiError.message || 'Failed to fetch history';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (hasMore && !loading && lastEvaluatedKey) {
            fetchHistory(true, lastEvaluatedKey);
        }
    };

    const refresh = () => {
        fetchHistory(false);
    };

    // Get detailed generation data
    const getGenerationDetails = async (generationId: string) => {
        try {
            const response = await axiosInstance.get(
                `${VIDEO_GENIE_ENDPOINTS.GET_GENERATION_DETAILS(generationId)}`
            );
            return response.data.generation;
        } catch (err: unknown) {
            console.error('Error fetching generation details:', err);
            const apiError = err as ApiError;
            const errorMessage = apiError.response?.data?.error || apiError.message || 'Failed to fetch generation details';
            throw new Error(errorMessage);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchHistory();
    }, [limit, sortOrder]);

    // Auto refresh
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchHistory();
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval]);

    return {
        history,
        loading,
        error,
        hasMore,
        refresh,
        loadMore,
        getGenerationDetails
    };
}; 