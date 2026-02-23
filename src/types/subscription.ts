export interface UserSubscription {
    userId: string;
    granted_credits: number;
    expiredAt: string;
    updatedAt: string;
    updateReason: string;
    remainingCredits: number;
    plan: string;
}

export enum PlanType {
    FOUNDERS = 'founders',
    BASIC = 'basic',
    PREMIUM = 'premium'
}

export enum UpdateReason {
    INITIAL_GRANT = 'initial_grant',
    CREDIT_USED = 'credit_used',
    QUOTA_RENEWED = 'quota_renewed',
    MANUAL_ADJUSTMENT = 'manual_adjustment'
}

export interface SubscriptionConfig {
    defaultCredits: number;
    defaultExpiryHours: number;
    defaultPlan: PlanType;
} 