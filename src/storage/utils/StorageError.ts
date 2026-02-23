export class StorageError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StorageError';
    }
}

export class StorageNotFoundError extends StorageError {
    constructor(generationId: string) {
        super(`Generation state not found: ${generationId}`);
        this.name = 'StorageNotFoundError';
    }
}

export class StorageInitializationError extends StorageError {
    constructor(message: string) {
        super(`Failed to initialize storage: ${message}`);
        this.name = 'StorageInitializationError';
    }
}

export class StorageOperationError extends StorageError {
    constructor(operation: string, message: string) {
        super(`Storage operation '${operation}' failed: ${message}`);
        this.name = 'StorageOperationError';
    }
} 