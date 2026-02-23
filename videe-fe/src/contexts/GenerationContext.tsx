'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axiosInstance from '../lib/axiosInstance';
import { VIDEO_GENIE_ENDPOINTS } from '../lib/apiEndpoints';
import { GenerationDetails, GenerationStatus, GenerationSummary } from '@/lib/videoGenieApi';


export interface GenerationHistoryResponse {
    success: boolean;
    generations: GenerationSummary[];
    pagination: {
        hasMore: boolean;
        lastEvaluatedKey?: string;
        totalCount?: number;
    };
}

export interface GenerationContextOptions {
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

interface GenerationContextType {
    history: GenerationSummary[];
    loading: boolean;
    detailLoading: boolean;
    error: string | null;
    hasMore: boolean;
    refresh: () => void;
    loadMore: () => void;
    getGenerationDetails: (generationId: string) => Promise<GenerationDetails>;
    getGenerationById: (generationId: string) => GenerationSummary | null;
    updateGenerationStatus: (generationId: string, status: GenerationStatus) => void;
    updateGeneration: (generationId: string, updatedGeneration: GenerationSummary) => void;
    addGeneration: (generation: GenerationSummary) => void;
    removeGeneration: (generationId: string) => void;
    setAutoRefresh: (enabled: boolean) => void;
    isAutoRefreshEnabled: boolean;
    areAllGenerationsCompleted: () => boolean;
    hasIncompleteGenerations: () => boolean;
    clearHistory: () => Promise<void>;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

interface GenerationProviderProps {
    children: ReactNode;
    options?: GenerationContextOptions;
}

export const GenerationProvider: React.FC<GenerationProviderProps> = ({
    children,
    options = {}
}) => {
    const {
        limit = 100,
        sortOrder = 'desc',
        autoRefresh = false,
        refreshInterval = 1000
    } = options;

    const [history, setHistory] = useState<GenerationSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [lastEvaluatedKey, setLastEvaluatedKey] = useState<string | undefined>();
    const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(autoRefresh);

    const fetchHistory = useCallback(async (append = false, lastKey?: string) => {
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
                    // Merge real data with existing dummy data
                    setHistory(prev => {
                        const existingGenerations = prev.filter(gen =>
                            !newGenerations.some(newGen => newGen.generationId === gen.generationId)
                        );
                        return [...newGenerations, ...existingGenerations];
                    });
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
    }, [limit, sortOrder]);

    const loadMore = () => {
        if (hasMore && !loading && lastEvaluatedKey) {
            fetchHistory(true, lastEvaluatedKey);
        }
    };

    const refresh = () => {
        fetchHistory(false);
    };

    const clearHistory = useCallback(async () => {
        try {
            await axiosInstance.delete(VIDEO_GENIE_ENDPOINTS.CLEAR_HISTORY);
            setHistory([]);
            setHasMore(false);
            setLastEvaluatedKey(undefined);
            setError(null);
        } catch (err: unknown) {
            console.error('Error clearing history:', err);
            const apiError = err as ApiError;
            const errorMessage = apiError.response?.data?.error || apiError.message || 'Failed to clear history';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    const getGenerationDetails = async (generationId: string): Promise<GenerationDetails> => {
        try {
            setDetailLoading(true);
            const response = await axiosInstance.get(
                `${VIDEO_GENIE_ENDPOINTS.GET_GENERATION_DETAILS(generationId)}`
            );
            const generation = response.data.generation;

            // Update the generation in local state with real data
            updateGeneration(generationId, generation);

            return generation;
        } catch (err: unknown) {
            console.error('Error fetching generation details:', err);
            const apiError = err as ApiError;
            const errorMessage = apiError.response?.data?.error || apiError.message || 'Failed to fetch generation details';
            throw new Error(errorMessage);
        } finally {
            setDetailLoading(false);
        }
    };

    const getGenerationById = (generationId: string): GenerationSummary | null => {
        return history.find(gen => gen.generationId === generationId) || null;
    };

    const updateGenerationStatus = (generationId: string, status: GenerationStatus) => {
        setHistory(prev =>
            prev.map(gen =>
                gen.generationId === generationId
                    ? { ...gen, status }
                    : gen
            )
        );
    };

    const updateGeneration = (generationId: string, updatedGeneration: GenerationSummary) => {
        setHistory(prev =>
            prev.map(gen =>
                gen.generationId === generationId
                    ? updatedGeneration
                    : gen
            )
        );
    };

    const addGeneration = (generation: GenerationSummary) => {
        setHistory(prev => [generation, ...prev]);
    };

    const removeGeneration = (generationId: string) => {
        setHistory(prev => prev.filter(gen => gen.generationId !== generationId));
    };

    const setAutoRefresh = (enabled: boolean) => {
        setIsAutoRefreshEnabled(enabled);
    };

    const areAllGenerationsCompleted = useCallback(() => {
        if (history.length === 0) return true;

        return history.every(gen => {
            const status = gen.status;
            return status === 'final_video_ready' || status === 'uploaded' || status === 'error';
        });
    }, [history]);

    // Helper function to check if there are any incomplete history
    const hasIncompleteGenerations = useCallback(() => {
        if (history.length === 0) return false;

        return history.some(gen => {
            const status = gen.status;
            return status !== 'final_video_ready' && status !== 'uploaded' && status !== 'error';
        });
    }, [history]);

    // Initial fetch
    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Auto refresh
    useEffect(() => {
        if (!isAutoRefreshEnabled) return;

        const interval = setInterval(() => {
            fetchHistory();
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [isAutoRefreshEnabled, refreshInterval, fetchHistory]);

    const value: GenerationContextType = {
        history,
        loading,
        detailLoading,
        error,
        hasMore,
        refresh,
        loadMore,
        getGenerationDetails,
        getGenerationById,
        updateGenerationStatus,
        updateGeneration,
        addGeneration,
        removeGeneration,
        setAutoRefresh,
        isAutoRefreshEnabled,
        areAllGenerationsCompleted,
        hasIncompleteGenerations,
        clearHistory
    };

    return (
        <GenerationContext.Provider value={value}>
            {children}
        </GenerationContext.Provider>
    );
};

export const useGeneration = (): GenerationContextType => {
    const context = useContext(GenerationContext);
    if (context === undefined) {
        throw new Error('useGeneration must be used within a GenerationProvider');
    }
    return context;
}; 