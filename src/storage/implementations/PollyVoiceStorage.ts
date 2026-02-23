import { DynamoDB } from 'aws-sdk';
import { PollyVoice, VoiceSearchParams } from '../../types/pollyVoice';
import { StorageError, StorageNotFoundError, StorageInitializationError, StorageOperationError } from '../utils/StorageError';

export interface PollyVoiceStorageOptions {
    tableName?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string;
}

export class PollyVoiceStorage {
    private dynamoClient: DynamoDB.DocumentClient;
    private tableName: string;

    constructor() {
        this.tableName = '';
        this.dynamoClient = new DynamoDB.DocumentClient();
    }

    async initialize(options: PollyVoiceStorageOptions): Promise<void> {
        try {
            this.tableName = options.tableName || 'video-gennie-polly-voices';

            const config: DynamoDB.DocumentClient.DocumentClientOptions & DynamoDB.Types.ClientConfiguration = {
                region: options.region || process.env.AWS_REGION || 'us-east-1',
            };

            if (options.endpoint) {
                config.endpoint = options.endpoint;
            }

            this.dynamoClient = new DynamoDB.DocumentClient(config);
            await this.ensureTableExists();
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
                const params: DynamoDB.CreateTableInput = {
                    TableName: this.tableName,
                    KeySchema: [
                        { AttributeName: 'id', KeyType: 'HASH' }
                    ],
                    AttributeDefinitions: [
                        { AttributeName: 'id', AttributeType: 'S' },
                        { AttributeName: 'languageCode', AttributeType: 'S' },
                        { AttributeName: 'region', AttributeType: 'S' },
                        { AttributeName: 'isActive', AttributeType: 'S' }
                    ],
                    GlobalSecondaryIndexes: [
                        {
                            IndexName: 'LanguageCodeIndex',
                            KeySchema: [
                                { AttributeName: 'languageCode', KeyType: 'HASH' },
                                { AttributeName: 'isActive', KeyType: 'RANGE' }
                            ],
                            Projection: {
                                ProjectionType: 'ALL'
                            }
                        },
                        {
                            IndexName: 'RegionIndex',
                            KeySchema: [
                                { AttributeName: 'region', KeyType: 'HASH' },
                                { AttributeName: 'isActive', KeyType: 'RANGE' }
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

    async save(voice: PollyVoice): Promise<void> {
        try {
            const now = new Date().toISOString();
            const params: DynamoDB.DocumentClient.PutItemInput = {
                TableName: this.tableName,
                Item: {
                    ...voice,
                    isActive: voice.isActive.toString(),
                    updatedAt: now
                }
            };

            await this.dynamoClient.put(params).promise();
        } catch (error) {
            throw new StorageOperationError('save', String(error));
        }
    }

    /**
     * Upsert a voice - update if exists, create if not
     */
    async upsert(voice: PollyVoice): Promise<void> {
        try {
            const now = new Date().toISOString();
            const params: DynamoDB.DocumentClient.PutItemInput = {
                TableName: this.tableName,
                Item: {
                    ...voice,
                    isActive: voice.isActive.toString(),
                    updatedAt: now
                }
            };

            await this.dynamoClient.put(params).promise();
        } catch (error) {
            throw new StorageOperationError('upsert', String(error));
        }
    }

    /**
     * Find voice by voiceId and region
     */
    async findByVoiceIdAndRegion(voiceId: string, region: string): Promise<PollyVoice | null> {
        try {
            const params: DynamoDB.DocumentClient.ScanInput = {
                TableName: this.tableName,
                FilterExpression: '#voiceId = :voiceId AND #region = :region',
                ExpressionAttributeNames: {
                    '#voiceId': 'voiceId',
                    '#region': 'region'
                },
                ExpressionAttributeValues: {
                    ':voiceId': voiceId,
                    ':region': region
                }
            };

            const result = await this.dynamoClient.scan(params).promise();
            
            if (!result.Items || result.Items.length === 0) {
                return null;
            }

            // Return the first match
            const item = result.Items[0];
            return {
                ...item,
                isActive: item.isActive === 'true'
            } as PollyVoice;
        } catch (error) {
            throw new StorageOperationError('findByVoiceIdAndRegion', String(error));
        }
    }

    async saveMany(voices: PollyVoice[]): Promise<void> {
        try {
            const batchSize = 25; // DynamoDB batch write limit
            for (let i = 0; i < voices.length; i += batchSize) {
                const batch = voices.slice(i, i + batchSize);
                const writeRequests = batch.map(voice => ({
                    PutRequest: {
                        Item: {
                            ...voice,
                            isActive: voice.isActive.toString(),
                            updatedAt: new Date().toISOString()
                        }
                    }
                }));

                const params: DynamoDB.DocumentClient.BatchWriteItemInput = {
                    RequestItems: {
                        [this.tableName]: writeRequests
                    }
                };

                await this.dynamoClient.batchWrite(params).promise();
            }
        } catch (error) {
            throw new StorageOperationError('saveMany', String(error));
        }
    }

    async get(id: string): Promise<PollyVoice | null> {
        try {
            const params: DynamoDB.DocumentClient.GetItemInput = {
                TableName: this.tableName,
                Key: { id }
            };

            const result = await this.dynamoClient.get(params).promise();
            if (!result.Item) return null;
            
            // Convert isActive back to boolean
            return {
                ...result.Item,
                isActive: result.Item.isActive === 'true'
            } as PollyVoice;
        } catch (error) {
            throw new StorageOperationError('get', String(error));
        }
    }

    async search(params: VoiceSearchParams): Promise<PollyVoice[]> {
        try {
            let queryParams: DynamoDB.DocumentClient.QueryInput | DynamoDB.DocumentClient.ScanInput;

            if (params.languageCode) {
                // Use LanguageCodeIndex
                queryParams = {
                    TableName: this.tableName,
                    IndexName: 'LanguageCodeIndex',
                    KeyConditionExpression: 'languageCode = :languageCode',
                    ExpressionAttributeValues: {
                        ':languageCode': params.languageCode
                    }
                };

                if (params.isActive !== undefined) {
                    queryParams.KeyConditionExpression += ' AND isActive = :isActive';
                    queryParams.ExpressionAttributeValues![':isActive'] = params.isActive.toString();
                }
            } else if (params.region) {
                // Use RegionIndex
                queryParams = {
                    TableName: this.tableName,
                    IndexName: 'RegionIndex',
                    KeyConditionExpression: 'region = :region',
                    ExpressionAttributeValues: {
                        ':region': params.region
                    }
                };

                if (params.isActive !== undefined) {
                    queryParams.KeyConditionExpression += ' AND isActive = :isActive';
                    queryParams.ExpressionAttributeValues![':isActive'] = params.isActive.toString();
                }
            } else {
                // Use scan with filters
                queryParams = {
                    TableName: this.tableName
                };

                const filterExpressions: string[] = [];
                const expressionAttributeValues: Record<string, any> = {};

                if (params.isActive !== undefined) {
                    filterExpressions.push('isActive = :isActive');
                    expressionAttributeValues[':isActive'] = params.isActive.toString();
                }

                if (params.gender) {
                    filterExpressions.push('gender = :gender');
                    expressionAttributeValues[':gender'] = params.gender;
                }

                if (filterExpressions.length > 0) {
                    queryParams.FilterExpression = filterExpressions.join(' AND ');
                    queryParams.ExpressionAttributeValues = expressionAttributeValues;
                }
            }

            // Use scan for scan operations, query for query operations
            const isQuery = params.languageCode || params.region;
            const result = isQuery 
                ? await this.dynamoClient.query(queryParams as DynamoDB.DocumentClient.QueryInput).promise()
                : await this.dynamoClient.scan(queryParams as DynamoDB.DocumentClient.ScanInput).promise();
                
            // Convert isActive back to boolean for the response
            const items = (result.Items || []) as any[];
            return items.map(item => ({
                ...item,
                isActive: item.isActive === 'true'
            })) as PollyVoice[];
        } catch (error) {
            throw new StorageOperationError('search', String(error));
        }
    }

    async update(id: string, updates: Partial<PollyVoice>): Promise<void> {
        try {
            const updateExpressions: string[] = [];
            const expressionAttributeNames: Record<string, string> = {};
            const expressionAttributeValues: Record<string, any> = {};

            Object.entries(updates).forEach(([key, value]) => {
                if (key !== 'id' && value !== undefined) {
                    const attributeName = `#${key}`;
                    const attributeValue = `:${key}`;
                    
                    // Convert isActive to string for storage
                    const finalValue = key === 'isActive' ? value.toString() : value;
                    
                    updateExpressions.push(`${attributeName} = ${attributeValue}`);
                    expressionAttributeNames[attributeName] = key;
                    expressionAttributeValues[attributeValue] = finalValue;
                }
            });

            // Always update the updatedAt timestamp
            updateExpressions.push('#updatedAt = :updatedAt');
            expressionAttributeNames['#updatedAt'] = 'updatedAt';
            expressionAttributeValues[':updatedAt'] = new Date().toISOString();

            const params: DynamoDB.DocumentClient.UpdateItemInput = {
                TableName: this.tableName,
                Key: { id },
                UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues
            };

            await this.dynamoClient.update(params).promise();
        } catch (error) {
            throw new StorageOperationError('update', String(error));
        }
    }

    async delete(id: string): Promise<void> {
        try {
            const params: DynamoDB.DocumentClient.DeleteItemInput = {
                TableName: this.tableName,
                Key: { id }
            };

            await this.dynamoClient.delete(params).promise();
        } catch (error) {
            throw new StorageOperationError('delete', String(error));
        }
    }

    async getAll(): Promise<PollyVoice[]> {
        try {
            const params: DynamoDB.DocumentClient.ScanInput = {
                TableName: this.tableName
            };

            const result = await this.dynamoClient.scan(params).promise();
            const items = (result.Items || []) as any[];
            
            // Convert isActive back to boolean
            return items.map(item => ({
                ...item,
                isActive: item.isActive === 'true'
            })) as PollyVoice[];
        } catch (error) {
            throw new StorageOperationError('getAll', String(error));
        }
    }
} 