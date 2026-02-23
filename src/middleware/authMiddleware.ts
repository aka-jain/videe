import { Request, Response, NextFunction } from 'express';
import { initBaseAuth } from '@propelauth/node';

// Initialize PropelAuth with your configuration
const propelAuth = initBaseAuth({
    authUrl: process.env.PROPEL_AUTH_URL || "https://your-org.propelauth.com",
    apiKey: process.env.PROPEL_AUTH_API_KEY || "",
});

// Get the validateAccessTokenAndGetUserClass function
const { validateAccessTokenAndGetUserClass } = propelAuth;

// Dummy user data for development/testing
const dummyUser = {
    userId: '90ec479b-b1ed-439c-82de-65b46171e7f2',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    properties: {},
    legacyUserId: undefined,
    impersonatorUserId: undefined,
    activeOrgId: undefined,
    // Mock user class methods
    getOrg: (orgId: string) => ({ orgId, name: 'Test Org' }),
    getOrgs: () => [{ orgId: 'test-org-123', name: 'Test Org' }],
    isRole: (orgId: string, role: string) => true,
    hasPermission: (orgId: string, permission: string) => true,
    isImpersonating: () => false,
    userClass: null
};

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
                firstName?: string;
                lastName?: string;
                username?: string;
                properties?: { [key: string]: unknown };
                legacyUserId?: string;
                impersonatorUserId?: string;
                activeOrgId?: string;
                // Add user class methods as properties
                getOrg?: (orgId: string) => any;
                getOrgs?: () => any[];
                isRole?: (orgId: string, role: string) => boolean;
                hasPermission?: (orgId: string, permission: string) => boolean;
                isImpersonating?: () => boolean;
                [key: string]: any;
            };
        }
    }
}

/**
 * Authentication middleware that validates PropelAuth tokens
 * and adds user details to the request object
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Check if we should use dummy auth for development/testing
        const useDummyAuth = process.env.USE_DUMMY_AUTH === 'true' ||
            process.env.NODE_ENV === 'development';

        if (useDummyAuth) {
            req.user = dummyUser;
            return next();
        }

        // Extract authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please provide a valid authorization token'
            });
        }

        // Validate the token with PropelAuth - pass the full authorization header
        const user = await validateAccessTokenAndGetUserClass(authHeader);

        if (!user) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'The provided token is invalid or expired'
            });
        }

        // Add user details to the request object
        req.user = {
            userId: user.userId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            properties: user.properties,
            legacyUserId: user.legacyUserId,
            impersonatorUserId: user.impersonatorUserId,
            activeOrgId: user.activeOrgId,
            // Add user class methods
            getOrg: user.getOrg.bind(user),
            getOrgs: user.getOrgs.bind(user),
            isRole: user.isRole.bind(user),
            hasPermission: user.hasPermission.bind(user),
            isImpersonating: user.isImpersonating.bind(user),
            // Preserve the original user class
            userClass: user
        };

        // Continue to the next middleware or route handler
        next();
    } catch (error) {
        console.error('Authentication error:', error);

        // Handle specific PropelAuth errors
        if (error instanceof Error) {
            if (error.message.includes('expired') || error.message.includes('invalid')) {
                return res.status(401).json({
                    error: 'Token expired or invalid',
                    message: 'Please log in again'
                });
            }
        }

        return res.status(500).json({
            error: 'Authentication service error',
            message: 'Unable to validate authentication'
        });
    }
};

/**
 * Optional middleware for routes that can work with or without authentication
 * Sets req.user if token is valid, but doesn't block the request if not
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Check if we should use dummy auth for development/testing
        const useDummyAuth = process.env.USE_DUMMY_AUTH === 'true' ||
            process.env.NODE_ENV === 'development';

        if (useDummyAuth) {
            console.log('🔧 Using dummy authentication data for optional auth');
            req.user = dummyUser;
            return next();
        }

        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const user = await validateAccessTokenAndGetUserClass(authHeader);
                if (user) {
                    req.user = {
                        userId: user.userId,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        username: user.username,
                        properties: user.properties,
                        legacyUserId: user.legacyUserId,
                        impersonatorUserId: user.impersonatorUserId,
                        activeOrgId: user.activeOrgId,
                        // Add user class methods
                        getOrg: user.getOrg.bind(user),
                        getOrgs: user.getOrgs.bind(user),
                        isRole: user.isRole.bind(user),
                        hasPermission: user.hasPermission.bind(user),
                        isImpersonating: user.isImpersonating.bind(user),
                        // Preserve the original user class
                        userClass: user
                    };
                }
            } catch (error) {
                // Silently ignore authentication errors for optional auth
                console.log('Optional auth failed:', error);
            }
        }

        next();
    } catch (error) {
        // For optional auth, continue even if there's an error
        console.error('Optional auth error:', error);
        next();
    }
};

export default authenticateUser; 