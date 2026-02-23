# DynamoDB Storage Implementation

This document describes how to use the DynamoDB storage implementation for the Video Gennie storage factory.

## Overview

The `DynamoDBStorage` class implements the `GenerationStateStorage` interface and stores generation states in Amazon DynamoDB. It provides all the standard storage operations (save, get, update, delete, etc.) with DynamoDB as the backend.

## Features

- **Automatic Table Creation**: Creates the DynamoDB table if it doesn't exist
- **Pay-per-Request Billing**: Uses on-demand billing mode for cost efficiency
- **Flexible Configuration**: Supports various AWS credential methods
- **Batch Operations**: Efficient batch cleanup operations
- **Health Monitoring**: Built-in health checks and metrics
- **Timestamp Tracking**: Automatic `createdAt` and `updatedAt` timestamps

## Table Schema

The DynamoDB table uses the following schema:

```
Primary Key: generationId (String)
Attributes:
- generationId: String (Hash Key)
- initialParams: Map
- script: Map (optional)
- audio: Map (optional)
- keywords: Map (optional)
- clips: Map (optional)
- baseVideo: Map (optional)
- finalVideo: Map (optional)
- youtube: Map (optional)
- createdAt: String (ISO timestamp)
- updatedAt: String (ISO timestamp)
```

## Configuration

### Basic Configuration

```typescript
import { StorageFactory } from "./storage/StorageFactory";

const storage = await StorageFactory.createStorage({
  type: "dynamodb",
  options: {
    tableName: "video-gennie-generations",
    region: "us-east-1",
  },
});
```

### Advanced Configuration

```typescript
const storage = await StorageFactory.createStorage({
  type: "dynamodb",
  options: {
    tableName: "my-custom-table",
    region: "us-west-2",
    accessKeyId: "YOUR_ACCESS_KEY",
    secretAccessKey: "YOUR_SECRET_KEY",
    // For local DynamoDB development
    endpoint: "http://localhost:8000",
  },
});
```

### Environment-based Configuration

```typescript
// Using environment variables
const storage = await StorageFactory.createStorage({
  type: "dynamodb",
  options: {
    tableName: process.env.DYNAMODB_TABLE_NAME || "video-gennie-generations",
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.DYNAMODB_ENDPOINT, // For local development
  },
});
```

## Environment Variables

The following environment variables can be used for configuration:

- `DYNAMODB_TABLE_NAME`: Name of the DynamoDB table
- `AWS_REGION`: AWS region for DynamoDB
- `AWS_ACCESS_KEY_ID`: AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `DYNAMODB_ENDPOINT`: Custom DynamoDB endpoint (for local development)

## AWS Credentials

The implementation supports multiple ways to provide AWS credentials:

1. **Environment Variables**: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
2. **Explicit Configuration**: Pass credentials in the options
3. **AWS Credentials Chain**: Uses default AWS credential providers (IAM roles, profiles, etc.)

## Local Development

For local development, you can use DynamoDB Local:

```bash
# Download and run DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local
```

Then configure the storage with the local endpoint:

```typescript
const storage = await StorageFactory.createStorage({
  type: "dynamodb",
  options: {
    endpoint: "http://localhost:8000",
    region: "us-east-1",
    accessKeyId: "fake",
    secretAccessKey: "fake",
  },
});
```

## Usage Examples

### Basic Operations

```typescript
import { StorageFactory } from "./storage/StorageFactory";
import { GenerationState } from "./types/generation";
import { LanguageCode } from "./config/languages";

// Initialize storage
const storage = await StorageFactory.createStorage({
  type: "dynamodb",
  options: { tableName: "video-gennie-generations" },
});

// Create a generation state
const state: GenerationState = {
  generationId: "gen_123",
  initialParams: {
    prompt: "Create a video about AI",
    language: LanguageCode.English,
    options: { aspectRatio: "16:9" },
  },
};

// Save state
await storage.save(state);

// Get state
const retrieved = await storage.get("gen_123");

// Update state
await storage.update("gen_123", {
  script: {
    content: "AI is transforming our world...",
    mood: "informative",
    source: "generated",
  },
});

// Delete state
await storage.delete("gen_123");
```

### Health Monitoring

```typescript
// Check if storage is healthy
const isHealthy = await storage.isHealthy();
console.log("Storage health:", isHealthy);

// Get storage metrics
const metrics = await storage.getMetrics();
console.log("Active generations:", metrics.activeGenerations);
console.log("Operations:", metrics.operations);
```

### Cleanup Operations

```typescript
// Clean up generations older than 24 hours
await storage.cleanup();

// Clean up generations older than 1 hour
await storage.cleanup(60 * 60 * 1000);
```

## Error Handling

The implementation throws specific error types:

- `StorageInitializationError`: When storage initialization fails
- `StorageNotFoundError`: When trying to update/get non-existent generation
- `StorageOperationError`: When DynamoDB operations fail

```typescript
try {
  await storage.save(state);
} catch (error) {
  if (error instanceof StorageNotFoundError) {
    console.log("Generation not found");
  } else if (error instanceof StorageOperationError) {
    console.log("DynamoDB operation failed:", error.message);
  }
}
```

## Cost Considerations

- The table uses **Pay-per-Request** billing mode for cost efficiency
- Consider using **Provisioned** billing mode for high-throughput applications
- Use the `cleanup()` method regularly to remove old generations
- Monitor costs through AWS Cost Explorer

## Security

- Use IAM roles instead of access keys when possible
- Implement least-privilege access policies
- Consider using VPC endpoints for private access
- Enable encryption at rest and in transit

## Troubleshooting

### Common Issues

1. **Credentials Error**: Ensure AWS credentials are properly configured
2. **Table Not Found**: The implementation auto-creates tables, but check permissions
3. **Region Mismatch**: Ensure the region in configuration matches your AWS setup
4. **Local DynamoDB**: Use fake credentials for local development

### Debug Mode

Enable AWS SDK debug logging:

```typescript
process.env.AWS_SDK_LOAD_CONFIG = "1";
process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = "1";
```

## Migration from File Storage

To migrate from file storage to DynamoDB:

1. Read existing generation states from file storage
2. Initialize DynamoDB storage
3. Save each state to DynamoDB
4. Update your application configuration

```typescript
// Migration example
const fileStorage = await StorageFactory.createStorage({ type: "file" });
const dynamoStorage = await StorageFactory.createStorage({ type: "dynamodb" });

// Get all generations from file storage and migrate
// Implementation depends on your specific migration needs
```
