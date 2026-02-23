import { GenerationStateStorage, StorageOptions } from './interfaces/GenerationStateStorage';
import { FileSystemStorage } from './implementations/FileSystemStorage';
import { DynamoDBStorage, DynamoDBStorageOptions } from './implementations/DynamoDBStorage';
import { StorageInitializationError } from './utils/StorageError';

export type StorageType = 'file' | 'memory' | 'database' | 'dynamodb';

export type FileStorageConfig = {
    type: StorageType;
    options?: StorageOptions;
}

export type DynamoDBStorageConfig = {
    type: 'dynamodb';
    options: DynamoDBStorageOptions;
}

export type StorageConfig = FileStorageConfig | DynamoDBStorageConfig;

export class StorageFactory {
    private static instance: GenerationStateStorage | null = null;

    static async createStorage(config: StorageConfig): Promise<GenerationStateStorage> {
        if (StorageFactory.instance) {
            return StorageFactory.instance;
        }

        let storage: GenerationStateStorage;

        switch (config.type) {
            case 'file':
                storage = new FileSystemStorage();
                break;
            case 'dynamodb':
                storage = new DynamoDBStorage();
                break;
            // Add other storage implementations here
            default:
                throw new StorageInitializationError(`Unsupported storage type: ${config.type}`);
        }

        await storage.initialize(config.options || {});
        StorageFactory.instance = storage;
        return storage;
    }

    static getInstance(): GenerationStateStorage {
        if (!StorageFactory.instance) {
            throw new StorageInitializationError('Storage not initialized. Call createStorage first.');
        }
        return StorageFactory.instance;
    }

    static async destroyInstance(): Promise<void> {
        StorageFactory.instance = null;
    }
} 