# Subscription Service

The subscription service manages user credits and plan-based access control for video generation.

## Database Schema

The subscription system uses a separate DynamoDB table `user-subscriptions` with the following structure:

| Field            | Type                  | Description                     |
| ---------------- | --------------------- | ------------------------------- |
| userId           | String (PK)           | Unique user identifier          |
| granted_credits  | Number                | Total credits allocated to user |
| expiredAt        | String (ISO DateTime) | When the current quota expires  |
| updatedAt        | String (ISO DateTime) | Last update timestamp           |
| updateReason     | String                | Reason for last update          |
| remainingCredits | Number                | Current available credits       |
| plan             | String                | User's subscription plan        |

## Business Rules

The subscription system implements the following business logic:

### 1. New User Creation

- When a user doesn't exist in the table, they are automatically created
- Default plan: `founders`
- Default credits: `2`
- Default expiry: `24 hours` from creation

### 2. Credit Consumption

- When user exists and has remaining credits, reduce count by 1
- Each video generation consumes exactly 1 credit

### 3. Insufficient Credits

- When user exists but has no remaining credits and expiry not reached
- Throws `InsufficientCreditsError` with renewal time message
- Returns HTTP 402 with renewal time information

### 4. Automatic Renewal (Founders Plan)

- When user exists, expiry has been reached, and plan is `founders`
- Automatically extends expiry by 24 hours
- Resets remaining credits to granted credits amount
- Consumes 1 credit for current generation

## Error Handling

### Custom Errors

- `SubscriptionError` - Base subscription error
- `InsufficientCreditsError` - No credits remaining
- `SubscriptionExpiredError` - Subscription expired (non-founders)
- `SubscriptionOperationError` - Database operation failed

### HTTP Status Codes

- `402 Payment Required` - Insufficient credits or expired subscription
- `400 Bad Request` - General subscription error
- `503 Service Unavailable` - Service not initialized

## Environment Variables

Configure the subscription service with these environment variables:

```bash
SUBSCRIPTION_TABLE_NAME=user-subscriptions  # DynamoDB table name
DEFAULT_CREDITS=2                           # Default credits for new users
DEFAULT_EXPIRY_HOURS=24                     # Default expiry duration
AWS_REGION=us-east-1                        # AWS region
DYNAMODB_ENDPOINT=                          # Local DynamoDB endpoint (optional)
```

## API Endpoints

### Check Subscription Status

```
GET /api/video/subscription
```

Returns current user subscription details including credit balance and expiry.

### Generation with Credit Check

```
POST /api/video/generation/init
```

Automatically checks and consumes credits before initializing video generation.

## Integration

The subscription service is automatically initialized when video routes are set up and integrated into the `/generation/init` endpoint through the `withStorageError` middleware.

## Plan Types

Currently supported plans:

- `founders` - Auto-renewing credits with 24-hour cycles
- `basic` - Future implementation
- `premium` - Future implementation

## Future Enhancements

- Different credit amounts per plan
- Variable renewal periods
- Credit purchase functionality
- Usage analytics
- Admin credit management
