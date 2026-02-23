import fs from 'fs/promises';
import path from 'path';
import { GenerationState, GenerationSummary, PaginationOptions, PaginatedResult } from '../../types/generation';
import { GenerationStateStorage, StorageOptions, StorageMetrics } from '../interfaces/GenerationStateStorage';
import { StorageError, StorageNotFoundError, StorageInitializationError, StorageOperationError } from '../utils/StorageError';

export class FileSystemStorage implements GenerationStateStorage {
    private basePath: string;
    private metrics: StorageMetrics = {
        operations: {},
        totalSize: 0,
        activeGenerations: 0
    };

    constructor() {
        this.basePath = '';
    }

    private getGenerationPath(generationId: string): string {
        return path.join(this.basePath, 'generations', generationId);
    }

    private getStatePath(generationId: string): string {
        return path.join(this.getGenerationPath(generationId), 'state.json');
    }

    private async ensureDirectory(dirPath: string): Promise<void> {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            throw new StorageInitializationError(`Failed to create directory ${dirPath}: ${error}`);
        }
    }

    private async recordOperation(operation: string): Promise<void> {
        this.metrics.operations[operation] = (this.metrics.operations[operation] || 0) + 1;
    }

    async initialize(options: StorageOptions): Promise<void> {
        try {
            this.basePath = options.basePath || path.join(process.cwd(), 'storage');
            await this.ensureDirectory(path.join(this.basePath, 'generations'));

            // Initialize metrics
            const generations = await fs.readdir(path.join(this.basePath, 'generations'));
            this.metrics.activeGenerations = generations.length;

            // Calculate total size
            let totalSize = 0;
            for (const generation of generations) {
                const stats = await fs.stat(this.getGenerationPath(generation));
                totalSize += stats.size;
            }
            this.metrics.totalSize = totalSize;
        } catch (error) {
            throw new StorageInitializationError(String(error));
        }
    }

    async save(state: GenerationState): Promise<void> {
        try {
            const generationPath = this.getGenerationPath(state.generationId);
            await this.ensureDirectory(generationPath);

            // Add timestamps and status if not present
            const stateToSave = {
                ...state,
                createdAt: state.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: state.status || 'initialized',
                title: state.title || state.initialParams.prompt.substring(0, 100)
            };

            const statePath = this.getStatePath(state.generationId);
            await fs.writeFile(statePath, JSON.stringify(stateToSave, null, 2));

            this.metrics.activeGenerations++;
            await this.recordOperation('save');
        } catch (error) {
            throw new StorageOperationError('save', String(error));
        }
    }

    async get(generationId: string): Promise<GenerationState | null> {
        try {
            const statePath = this.getStatePath(generationId);
            const content = await fs.readFile(statePath, 'utf-8');
            await this.recordOperation('get');
            return JSON.parse(content) as GenerationState;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }
            throw new StorageOperationError('get', String(error));
        }
    }

    async getUserGeneration(userId: string, generationId: string): Promise<GenerationState | null> {
        try {
            const generation = await this.get(generationId);

            if (!generation) {
                return null;
            }

            // Verify ownership
            if (generation.userId !== userId) {
                return null;
            }

            await this.recordOperation('getUserGeneration');
            return generation;
        } catch (error) {
            throw new StorageOperationError('getUserGeneration', String(error));
        }
    }

    async getUserGenerations(userId: string, options: PaginationOptions = {}): Promise<PaginatedResult<GenerationSummary>> {
        try {
            const {
                limit = 20,
                lastEvaluatedKey,
                sortOrder = 'desc'
            } = options;

            const generationsDir = path.join(this.basePath, 'generations');
            const generationIds = await fs.readdir(generationsDir);

            // Load all generations for the user
            const userGenerations: GenerationState[] = [];

            for (const generationId of generationIds) {
                try {
                    const generation = await this.get(generationId);
                    if (generation && generation.userId === userId) {
                        userGenerations.push(generation);
                    }
                } catch (error) {
                    // Skip invalid generation files
                    continue;
                }
            }

            // Sort by createdAt
            userGenerations.sort((a, b) => {
                const dateA = new Date(a.createdAt || '').getTime();
                const dateB = new Date(b.createdAt || '').getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            });

            // Handle pagination
            let startIndex = 0;
            if (lastEvaluatedKey) {
                try {
                    const lastKey = JSON.parse(lastEvaluatedKey);
                    const lastIndex = userGenerations.findIndex(g => g.generationId === lastKey.generationId);
                    if (lastIndex >= 0) {
                        startIndex = lastIndex + 1;
                    }
                } catch (error) {
                    // Invalid lastEvaluatedKey, start from beginning
                }
            }

            const paginatedGenerations = userGenerations.slice(startIndex, startIndex + limit);

            // Convert to GenerationSummary
            const items: GenerationSummary[] = paginatedGenerations.map(generation => ({
                generationId: generation.generationId,
                isInstantVideo: generation.isInstantVideo,
                prompt: generation.initialParams?.prompt || '',
                title: generation.title,
                status: generation.status,
                createdAt: generation.createdAt || '',
                updatedAt: generation.updatedAt || '',
                language: generation.initialParams?.options?.languageCode || 'en-US',
                voiceId: generation.initialParams?.options?.voiceId || 'Matthew',
                twoPhaseScriptGeneration: generation.initialParams?.options?.twoPhaseScriptGeneration || false,
                finalVideo: generation.finalVideo,
                aspectRatio: generation.initialParams?.options?.aspectRatio || '16:9',
                hasVideo: !!generation.finalVideo?.videoUrl,
                hasYouTubeUpload: !!generation.youtube?.videoId
            }));

            const hasMore = startIndex + limit < userGenerations.length;
            const nextKey = hasMore && items.length > 0
                ? JSON.stringify({ generationId: items[items.length - 1].generationId })
                : undefined;

            await this.recordOperation('getUserGenerations');

            return {
                items,
                lastEvaluatedKey: nextKey,
                hasMore,
                totalCount: userGenerations.length
            };
        } catch (error) {
            throw new StorageOperationError('getUserGenerations', String(error));
        }
    }

    async update(generationId: string, state: Partial<GenerationState>): Promise<void> {
        try {
            const currentState = await this.get(generationId);
            if (!currentState) {
                throw new StorageNotFoundError(generationId);
            }

            // Update status based on what fields are being updated
            let newStatus = currentState.status;
            if (state.script && !state.status) {
                newStatus = 'script_generated';
            } else if (state.audio && !state.status) {
                newStatus = 'audio_generated';
            } else if (state.keywords && !state.status) {
                newStatus = 'keywords_generated';
            } else if (state.clips && !state.status) {
                newStatus = 'clips_processed';
            } else if (state.baseVideo && !state.status) {
                newStatus = 'video_merged';
            } else if (state.finalVideo && !state.status) {
                newStatus = 'final_video_ready';
            } else if (state.youtube && !state.status) {
                newStatus = 'uploaded';
            }

            const updatedState = {
                ...currentState,
                ...state,
                updatedAt: new Date().toISOString(),
                status: state.status || newStatus
            };

            await fs.writeFile(
                this.getStatePath(generationId),
                JSON.stringify(updatedState, null, 2)
            );

            await this.recordOperation('update');
        } catch (error) {
            if (error instanceof StorageError) {
                throw error;
            }
            throw new StorageOperationError('update', String(error));
        }
    }

    async delete(generationId: string): Promise<void> {
        try {
            const generationPath = this.getGenerationPath(generationId);
            await fs.rm(generationPath, { recursive: true, force: true });

            this.metrics.activeGenerations = Math.max(0, this.metrics.activeGenerations - 1);
            await this.recordOperation('delete');
        } catch (error) {
            throw new StorageOperationError('delete', String(error));
        }
    }

    async isHealthy(): Promise<boolean> {
        try {
            const testFile = path.join(this.basePath, 'health_check.tmp');
            await fs.writeFile(testFile, 'health check');
            await fs.unlink(testFile);
            return true;
        } catch {
            return false;
        }
    }

    async getMetrics(): Promise<StorageMetrics> {
        return { ...this.metrics };
    }

    async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
        try {
            const generations = await fs.readdir(path.join(this.basePath, 'generations'));
            const now = Date.now();

            for (const generationId of generations) {
                const statePath = this.getStatePath(generationId);
                const stats = await fs.stat(statePath);

                if (now - stats.mtimeMs > maxAge) {
                    await this.delete(generationId);
                }
            }

            await this.recordOperation('cleanup');
        } catch (error) {
            throw new StorageOperationError('cleanup', String(error));
        }
    }

    async clearAll(): Promise<void> {
        try {
            const generationsDir = path.join(this.basePath, 'generations');
            const generationIds = await fs.readdir(generationsDir);
            for (const generationId of generationIds) {
                await this.delete(generationId);
            }
            this.metrics.activeGenerations = 0;
            this.metrics.totalSize = 0;
            await this.recordOperation('clearAll');
        } catch (error) {
            throw new StorageOperationError('clearAll', String(error));
        }
    }
} 