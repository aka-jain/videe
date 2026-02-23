import { DynamoDB } from 'aws-sdk';
import { UserSubscription, PlanType, UpdateReason, SubscriptionConfig } from '../types/subscription';
import {
    SubscriptionError,
    InsufficientCreditsError,
    SubscriptionExpiredError,
    SubscriptionOperationError
} from '../utils/subscriptionErrors';

export class SubscriptionService {
    private dynamoClient: DynamoDB.DocumentClient;
    private tableName: string;
    private config: SubscriptionConfig;

    constructor() {
        this.tableName = process.env.SUBSCRIPTION_TABLE_NAME || 'user-subscriptions';
        this.config = {
            defaultCredits: parseInt(process.env.DEFAULT_CREDITS || '2'),
            defaultExpiryHours: parseInt(process.env.DEFAULT_EXPIRY_HOURS || '24'),
            defaultPlan: PlanType.FOUNDERS
        };

        // Configure DynamoDB client
        const config: DynamoDB.DocumentClient.DocumentClientOptions & DynamoDB.Types.ClientConfiguration = {
            region: process.env.AWS_REGION || 'us-east-1',
        };

        if (process.env.DYNAMODB_ENDPOINT) {
            config.endpoint = process.env.DYNAMODB_ENDPOINT;
        }

        this.dynamoClient = new DynamoDB.DocumentClient(config);
    }

    async initialize(): Promise<void> {
        try {
            await this.ensureTableExists();
        } catch (error) {
            throw new SubscriptionOperationError('initialize', String(error));
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
                        { AttributeName: 'userId', KeyType: 'HASH' }
                    ],
                    AttributeDefinitions: [
                        { AttributeName: 'userId', AttributeType: 'S' }
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

    async getUserSubscription(userId: string): Promise<UserSubscription | null> {
        try {
            const params: DynamoDB.DocumentClient.GetItemInput = {
                TableName: this.tableName,
                Key: { userId }
            };

            const result = await this.dynamoClient.get(params).promise();

            if (!result.Item) {
                return null;
            }

            return result.Item as UserSubscription;
        } catch (error) {
            throw new SubscriptionOperationError('getUserSubscription', String(error));
        }
    }

    async createDefaultSubscription(userId: string): Promise<UserSubscription> {
        try {
            const now = new Date();
            const expiredAt = new Date(now.getTime() + (this.config.defaultExpiryHours * 60 * 60 * 1000));

            const subscription: UserSubscription = {
                userId,
                granted_credits: this.config.defaultCredits,
                expiredAt: expiredAt.toISOString(),
                updatedAt: now.toISOString(),
                updateReason: UpdateReason.INITIAL_GRANT,
                remainingCredits: this.config.defaultCredits,
                plan: this.config.defaultPlan
            };

            const params: DynamoDB.DocumentClient.PutItemInput = {
                TableName: this.tableName,
                Item: subscription
            };

            await this.dynamoClient.put(params).promise();
            return subscription;
        } catch (error) {
            throw new SubscriptionOperationError('createDefaultSubscription', String(error));
        }
    }

    async consumeCredit(userId: string, updateReason: UpdateReason = UpdateReason.CREDIT_USED): Promise<void> {
        try {
            const params: DynamoDB.DocumentClient.UpdateItemInput = {
                TableName: this.tableName,
                Key: { userId },
                UpdateExpression: 'SET remainingCredits = remainingCredits - :decrement, updatedAt = :updatedAt, updateReason = :updateReason',
                ConditionExpression: 'remainingCredits > :zero',
                ExpressionAttributeValues: {
                    ':decrement': 1,
                    ':updatedAt': new Date().toISOString(),
                    ':updateReason': updateReason,
                    ':zero': 0
                }
            };

            await this.dynamoClient.update(params).promise();
        } catch (error: any) {
            if (error.code === 'ConditionalCheckFailedException') {
                throw new InsufficientCreditsError('next renewal time');
            }
            throw new SubscriptionOperationError('consumeCredit', String(error));
        }
    }

    async renewSubscription(userId: string): Promise<void> {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription) {
                throw new SubscriptionError('User subscription not found');
            }
            const oldExpiry = new Date(subscription.expiredAt);
            const newExpiry = new Date(oldExpiry.getTime() + (this.config.defaultExpiryHours * 60 * 60 * 1000));

            const params: DynamoDB.DocumentClient.UpdateItemInput = {
                TableName: this.tableName,
                Key: { userId },
                UpdateExpression: 'SET remainingCredits = :grantedCredits, expiredAt = :newExpiry, updatedAt = :updatedAt, updateReason = :updateReason',
                ExpressionAttributeValues: {
                    ':grantedCredits': subscription.granted_credits,
                    ':newExpiry': newExpiry.toISOString(),
                    ':updatedAt': new Date().toISOString(),
                    ':updateReason': UpdateReason.QUOTA_RENEWED
                }
            };

            await this.dynamoClient.update(params).promise();
        } catch (error) {
            if (error instanceof SubscriptionError) {
                throw error;
            }
            throw new SubscriptionOperationError('renewSubscription', String(error));
        }
    }

    isSubscriptionExpired(expiredAt: string): boolean {
        const now = new Date();
        const expiryDate = new Date(expiredAt);
        return now > expiryDate;
    }

    private formatRenewalTime(expiredAt: string): string {
        const renewalDate = new Date(expiredAt);
        const nextDay = new Date(renewalDate.getTime() + (24 * 60 * 60 * 1000));
        return nextDay.toLocaleString('en-US', {
            timeZone: 'UTC',
            dateStyle: 'medium',
            timeStyle: 'short'
        }) + ' UTC';
    }

    async checkAndConsumeCredit(userId: string): Promise<void> {
        try {
            let subscription = await this.getUserSubscription(userId);

            // Rule 1: If user doesn't exist, create with default founders plan
            if (!subscription) {
                subscription = await this.createDefaultSubscription(userId);
                // Consume 1 credit for the current generation
                await this.consumeCredit(userId);
                return;
            }

            const isExpired = this.isSubscriptionExpired(subscription.expiredAt);

            // Rule 4: If expired and founders plan, renew subscription
            if (isExpired && subscription.plan === PlanType.FOUNDERS) {
                await this.renewSubscription(userId);
                // Consume 1 credit for the current generation
                await this.consumeCredit(userId);
                return;
            }

            // Rule 3: If expired and not founders, throw error
            if (isExpired) {
                throw new SubscriptionExpiredError(subscription.expiredAt);
            }

            // Rule 2: If not expired, check credits and consume
            if (subscription.remainingCredits > 0) {
                await this.consumeCredit(userId);
                return;
            }

            // Rule 3: No remaining credits and not expired
            const renewalTime = this.formatRenewalTime(subscription.expiredAt);
            throw new InsufficientCreditsError(renewalTime);

        } catch (error) {
            if (error instanceof SubscriptionError) {
                throw error;
            }
            throw new SubscriptionOperationError('checkAndConsumeCredit', String(error));
        }
    }

    async isHealthy(): Promise<boolean> {
        try {
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
} 