import path from 'path';
import { StorageFactory, StorageConfig } from './StorageFactory';

export async function initializeStorage(): Promise<void> {
    const config: StorageConfig = {
        type: 'dynamodb',
        options: {
            tableName: 'video-gennie-generations',
            region: 'us-east-1'
        }
    };

    try {
        await StorageFactory.createStorage(config);
        console.log('Storage system initialized successfully');
    } catch (error) {
        console.error('Failed to initialize storage system:', error);
        throw error;
    }
} 