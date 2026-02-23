import { GenerationState, GenerationSummary, PaginationOptions, PaginatedResult } from '../../types/generation';

export interface StorageOptions {
    basePath?: string;
    cleanupInterval?: number;
    maxSize?: string;
}

export interface StorageMetrics {
    operations: Record<string, number>;
    totalSize: number;
    activeGenerations: number;
}

export interface GenerationStateStorage {
    /**
     * Initialize the storage with given options
     */
    initialize(options: StorageOptions): Promise<void>;

    /**
     * Save a new generation state
     */
    save(state: GenerationState): Promise<void>;

    /**
     * Retrieve a generation state by ID
     */
    get(generationId: string): Promise<GenerationState | null>;

    /**
     * Update an existing generation state
     */
    update(generationId: string, state: Partial<GenerationState>): Promise<void>;

    /**
     * Delete a generation state and its associated assets
     */
    delete(generationId: string): Promise<void>;

    /**
     * Get paginated list of generations for a user
     */
    getUserGenerations(userId: string, options?: PaginationOptions): Promise<PaginatedResult<GenerationSummary>>;

    /**
     * Get a generation by ID with user ownership validation
     */
    getUserGeneration(userId: string, generationId: string): Promise<GenerationState | null>;

    /**
     * Check if storage is healthy and operational
     */
    isHealthy(): Promise<boolean>;

    /**
     * Get current storage metrics
     */
    getMetrics(): Promise<StorageMetrics>;

    /**
     * Clean up old/expired generations
     */
    cleanup(maxAge?: number): Promise<void>;

    /**
     * Delete all generations (reset all DB/storage data). Use with caution.
     */
    clearAll(): Promise<void>;
} 