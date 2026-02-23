export class SubscriptionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SubscriptionError';
    }
}

export class InsufficientCreditsError extends SubscriptionError {
    public renewalTime: string;

    constructor(renewalTime: string) {
        super(`Insufficient credits. Your quota will renew at ${renewalTime}`);
        this.name = 'InsufficientCreditsError';
        this.renewalTime = renewalTime;
    }
}

export class SubscriptionExpiredError extends SubscriptionError {
    constructor(expiredAt: string) {
        super(`Subscription expired at ${expiredAt}`);
        this.name = 'SubscriptionExpiredError';
    }
}

export class SubscriptionOperationError extends SubscriptionError {
    constructor(operation: string, originalError: string) {
        super(`Subscription operation '${operation}' failed: ${originalError}`);
        this.name = 'SubscriptionOperationError';
    }
} 