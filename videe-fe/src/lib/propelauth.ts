import { AuthProvider } from "@propelauth/react";

// Propel Auth configuration
export const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "https://your-org.propelauth.com";

// Export the AuthProvider for use in the app
export { AuthProvider }; 