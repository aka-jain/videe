import { DynamoDB } from 'aws-sdk';
import { GenerationState, GenerationSummary, PaginationOptions, PaginatedResult } from '../../types/generation';
import { GenerationStateStorage, StorageOptions, StorageMetrics } from '../interfaces/GenerationStateStorage';
import { StorageError, StorageNotFoundError, StorageInitializationError, StorageOperationError } from '../utils/StorageError';
import { generatePresignedUrl } from '../../services/audioService';

export interface DynamoDBStorageOptions extends StorageOptions {
    tableName?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string; // For local DynamoDB
}

// make a change
export class DynamoDBStorage implements GenerationStateStorage {
    private dynamoClient: DynamoDB.DocumentClient;
    private tableName: string;
    private gsiName: string = 'UserGenerationsIndex';
    private metrics: StorageMetrics = {
        operations: {},
        totalSize: 0,
        activeGenerations: 0
    };

    constructor() {
        this.tableName = '';
        this.dynamoClient = new DynamoDB.DocumentClient();
    }

    private async recordOperation(operation: string): Promise<void> {
        this.metrics.operations[operation] = (this.metrics.operations[operation] || 0) + 1;
    }

    async initialize(options: DynamoDBStorageOptions): Promise<void> {
        try {
            this.tableName = options.tableName || 'video-gennie-generations';

            // Configure DynamoDB client
            const config: DynamoDB.DocumentClient.DocumentClientOptions & DynamoDB.Types.ClientConfiguration = {
                region: options.region || process.env.AWS_REGION || 'us-east-1',
            };

            if (options.endpoint) {
                config.endpoint = options.endpoint;
            }

            this.dynamoClient = new DynamoDB.DocumentClient(config);

            // Check if table exists and create if needed
            await this.ensureTableExists();

            // Initialize metrics
            await this.updateMetrics();
        } catch (error) {
            throw new StorageInitializationError(String(error));
        }
    }

    private async ensureTableExists(): Promise<void> {
        const config = (this.dynamoClient as any).options || {};
        const dynamodb = new DynamoDB({
            region: config.region,
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            endpoint: config.endpoint
        });

        try {
            await dynamodb.describeTable({ TableName: this.tableName }).promise();
        } catch (error: any) {
            if (error.code === 'ResourceNotFoundException') {
                // Table doesn't exist, create it
                const params: DynamoDB.CreateTableInput = {
                    TableName: this.tableName,
                    KeySchema: [
                        { AttributeName: 'generationId', KeyType: 'HASH' }
                    ],
                    AttributeDefinitions: [
                        { AttributeName: 'generationId', AttributeType: 'S' },
                        { AttributeName: 'userId', AttributeType: 'S' },
                        { AttributeName: 'createdAt', AttributeType: 'S' }
                    ],
                    GlobalSecondaryIndexes: [
                        {
                            IndexName: this.gsiName,
                            KeySchema: [
                                { AttributeName: 'userId', KeyType: 'HASH' },
                                { AttributeName: 'createdAt', KeyType: 'RANGE' }
                            ],
                            Projection: {
                                ProjectionType: 'ALL'
                            }
                        }
                    ],
                    BillingMode: 'PAY_PER_REQUEST',
                };

                await dynamodb.createTable(params).promise();
                await dynamodb.waitFor('tableExists', { TableName: this.tableName }).promise();
            } else {
                throw error;
            }
        }
    }

    private async updateMetrics(): Promise<void> {
        try {
            const params: DynamoDB.DocumentClient.ScanInput = {
                TableName: this.tableName,
                Select: 'COUNT'
            };

            const result = await this.dynamoClient.scan(params).promise();
            this.metrics.activeGenerations = result.Count || 0;

            // For totalSize, we'd need to scan and calculate, but for now we'll estimate
            this.metrics.totalSize = this.metrics.activeGenerations * 1024; // Rough estimate
        } catch (error) {
            // Don't throw error for metrics update failure
            console.warn('Failed to update metrics:', error);
        }
    }

    async save(state: GenerationState): Promise<void> {
        try {
            const now = new Date().toISOString();
            const params: DynamoDB.DocumentClient.PutItemInput = {
                TableName: this.tableName,
                Item: {
                    ...state,
                    createdAt: state.createdAt || now,
                    updatedAt: now,
                    status: state.status || 'initialized',
                    title: state.title || state.initialParams.prompt.substring(0, 100)
                }
            };

            await this.dynamoClient.put(params).promise();
            this.metrics.activeGenerations++;
            await this.recordOperation('save');
        } catch (error) {
            throw new StorageOperationError('save', String(error));
        }
    }

    async get(generationId: string): Promise<GenerationState | null> {
        try {
            const params: DynamoDB.DocumentClient.GetItemInput = {
                TableName: this.tableName,
                Key: { generationId }
            };

            const result = await this.dynamoClient.get(params).promise();
            await this.recordOperation('get');

            if (!result.Item) {
                return null;
            }

            return result.Item as GenerationState;
        } catch (error) {
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

            const params: DynamoDB.DocumentClient.QueryInput = {
                TableName: this.tableName,
                IndexName: this.gsiName,
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId
                },
                Limit: limit,
                ScanIndexForward: sortOrder === 'asc'
            };

            if (lastEvaluatedKey) {
                params.ExclusiveStartKey = JSON.parse(lastEvaluatedKey);
            }

            const result: DynamoDB.DocumentClient.QueryOutput = await this.dynamoClient.query(params).promise();
            await this.recordOperation('getUserGenerations');

            const items: GenerationSummary[] = (result.Items || []).map(item => ({
                generationId: item.generationId,
                prompt: item.initialParams?.prompt || '',
                title: item.title,
                isInstantVideo: item.isInstantVideo,
                twoPhaseScriptGeneration: item.initialParams?.options?.twoPhaseScriptGeneration,
                finalVideo: item.finalVideo,
                status: item.status,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                language: item.initialParams?.options?.languageCode,
                voiceId: item.initialParams?.options?.voiceId,
                aspectRatio: item.initialParams?.options?.aspectRatio || '16:9',
                hasVideo: !!item.finalVideo?.videoUrl,
                hasYouTubeUpload: !!item.youtube?.videoId
            }));

            for (const item of items) {
                // presign the final video url
                if (item.finalVideo?.videoUrl) {
                    item.finalVideo.videoUrl = await generatePresignedUrl(item.finalVideo.videoUrl);
                }
            }

            return {
                items,
                lastEvaluatedKey: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : undefined,
                hasMore: !!result.LastEvaluatedKey,
                totalCount: result.Count
            };
        } catch (error) {
            throw new StorageOperationError('getUserGenerations', String(error));
        }
    }

    async update(generationId: string, state: Partial<GenerationState>): Promise<void> {
        try {
            // First check if the item exists
            const existingState = await this.get(generationId);
            if (!existingState) {
                throw new StorageNotFoundError(generationId);
            }

            // Build update expression
            const updateExpression: string[] = [];
            const expressionAttributeNames: { [key: string]: string } = {};
            const expressionAttributeValues: { [key: string]: any } = {};

            Object.keys(state).forEach((key, index) => {
                if (key !== 'generationId') {
                    const attributeName = `#attr${index}`;
                    const attributeValue = `:val${index}`;

                    updateExpression.push(`${attributeName} = ${attributeValue}`);
                    expressionAttributeNames[attributeName] = key;
                    expressionAttributeValues[attributeValue] = (state as any)[key];
                }
            });

            // Add updatedAt timestamp
            updateExpression.push('#updatedAt = :updatedAt');
            expressionAttributeNames['#updatedAt'] = 'updatedAt';
            expressionAttributeValues[':updatedAt'] = new Date().toISOString();

            // Update status based on what fields are being updated
            if (state.script && !updateExpression.some(expr => expr.includes('status'))) {
                updateExpression.push('#status = :status');
                expressionAttributeNames['#status'] = 'status';
                expressionAttributeValues[':status'] = 'script_generated';
            } else if (state.audio && !updateExpression.some(expr => expr.includes('status'))) {
                updateExpression.push('#status = :status');
                expressionAttributeNames['#status'] = 'status';
                expressionAttributeValues[':status'] = 'audio_generated';
            } else if (state.keywords && !updateExpression.some(expr => expr.includes('status'))) {
                updateExpression.push('#status = :status');
                expressionAttributeNames['#status'] = 'status';
                expressionAttributeValues[':status'] = 'keywords_generated';
            } else if (state.clips && !updateExpression.some(expr => expr.includes('status'))) {
                updateExpression.push('#status = :status');
                expressionAttributeNames['#status'] = 'status';
                expressionAttributeValues[':status'] = 'clips_processed';
            } else if (state.baseVideo && !updateExpression.some(expr => expr.includes('status'))) {
                updateExpression.push('#status = :status');
                expressionAttributeNames['#status'] = 'status';
                expressionAttributeValues[':status'] = 'video_merged';
            } else if (state.finalVideo && !updateExpression.some(expr => expr.includes('status'))) {
                updateExpression.push('#status = :status');
                expressionAttributeNames['#status'] = 'status';
                expressionAttributeValues[':status'] = 'final_video_ready';
            } else if (state.youtube && !updateExpression.some(expr => expr.includes('status'))) {
                updateExpression.push('#status = :status');
                expressionAttributeNames['#status'] = 'status';
                expressionAttributeValues[':status'] = 'uploaded';
            }

            const params: DynamoDB.DocumentClient.UpdateItemInput = {
                TableName: this.tableName,
                Key: { generationId },
                UpdateExpression: `SET ${updateExpression.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues
            };

            await this.dynamoClient.update(params).promise();
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
            const params: DynamoDB.DocumentClient.DeleteItemInput = {
                TableName: this.tableName,
                Key: { generationId }
            };

            await this.dynamoClient.delete(params).promise();
            this.metrics.activeGenerations = Math.max(0, this.metrics.activeGenerations - 1);
            await this.recordOperation('delete');
        } catch (error) {
            throw new StorageOperationError('delete', String(error));
        }
    }

    async isHealthy(): Promise<boolean> {
        try {
            // Simple health check - try to describe the table
            const config = (this.dynamoClient as any).options || {};
            const dynamodb = new DynamoDB({
                region: config.region,
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
                endpoint: config.endpoint
            });

            await dynamodb.describeTable({ TableName: this.tableName }).promise();
            return true;
        } catch {
            return false;
        }
    }

    async getMetrics(): Promise<StorageMetrics> {
        await this.updateMetrics();
        return { ...this.metrics };
    }

    async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
        try {
            const cutoffDate = new Date(Date.now() - maxAge).toISOString();

            const scanParams: DynamoDB.DocumentClient.ScanInput = {
                TableName: this.tableName,
                FilterExpression: 'createdAt < :cutoffDate',
                ExpressionAttributeValues: {
                    ':cutoffDate': cutoffDate
                }
            };

            const result = await this.dynamoClient.scan(scanParams).promise();

            if (result.Items && result.Items.length > 0) {
                // Delete items in batches
                const batchSize = 25; // DynamoDB batch limit
                for (let i = 0; i < result.Items.length; i += batchSize) {
                    const batch = result.Items.slice(i, i + batchSize);

                    const deleteRequests = batch.map(item => ({
                        DeleteRequest: {
                            Key: { generationId: item.generationId }
                        }
                    }));

                    const batchParams: DynamoDB.DocumentClient.BatchWriteItemInput = {
                        RequestItems: {
                            [this.tableName]: deleteRequests
                        }
                    };

                    await this.dynamoClient.batchWrite(batchParams).promise();
                }
            }

            await this.recordOperation('cleanup');
        } catch (error) {
            throw new StorageOperationError('cleanup', String(error));
        }
    }

    async clearAll(): Promise<void> {
        try {
            let lastEvaluatedKey: DynamoDB.DocumentClient.Key | undefined;
            const batchSize = 25;

            do {
                const scanParams: DynamoDB.DocumentClient.ScanInput = {
                    TableName: this.tableName,
                    Limit: batchSize * 4,
                    ExclusiveStartKey: lastEvaluatedKey
                };
                const result = await this.dynamoClient.scan(scanParams).promise();
                lastEvaluatedKey = result.LastEvaluatedKey;

                if (result.Items && result.Items.length > 0) {
                    for (let i = 0; i < result.Items.length; i += batchSize) {
                        const batch = result.Items.slice(i, i + batchSize);
                        const deleteRequests = batch.map(item => ({
                            DeleteRequest: {
                                Key: { generationId: item.generationId }
                            }
                        }));
                        await this.dynamoClient.batchWrite({
                            RequestItems: { [this.tableName]: deleteRequests }
                        }).promise();
                    }
                }
            } while (lastEvaluatedKey);

            this.metrics.activeGenerations = 0;
            this.metrics.totalSize = 0;
            await this.recordOperation('clearAll');
        } catch (error) {
            throw new StorageOperationError('clearAll', String(error));
        }
    }
} 