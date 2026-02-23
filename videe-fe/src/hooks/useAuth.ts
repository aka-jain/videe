import { useAuthInfo, useLogoutFunction, useRedirectFunctions } from "@propelauth/react";
import { useEffect } from "react";
import { initializeAxiosAuth } from "../lib/axiosInstance";

export const useAuth = () => {
  const { user, isLoggedIn, loading, accessToken } = useAuthInfo();
  const logout = useLogoutFunction();
  const { redirectToLoginPage, redirectToSignupPage } = useRedirectFunctions();

  // Initialize axios with authentication when auth state is available
  useEffect(() => {
    if (!loading) {
      const getAccessToken = () => accessToken || null;
      const logoutWrapper = (redirectToLogin = true) => {
        logout(redirectToLogin);
      };
      initializeAxiosAuth(getAccessToken, logoutWrapper);
    }
  }, [accessToken, logout, loading]);

  return {
    user,
    isLoggedIn,
    loading,
    logout,
    redirectToLoginPage,
    redirectToSignupPage,
    accessToken,
  };
};

// Helper function to determine if a route should be accessible
export const shouldAllowRoute = (isLoggedIn: boolean, pathname: string): boolean => {
  // Studio routes are public (no auth required)
  if (pathname.startsWith("/studio")) {
    return true;
  }
  
  // Auth routes should only be accessible when not logged in
  if (pathname.startsWith("/auth")) {
    return !isLoggedIn;
  }
  
  // Home page should only be accessible when not logged in
  if (pathname === "/") {
    return !isLoggedIn;
  }
  
  // Allow all other routes
  return true;
};

// Routes that don't require auth to be resolved before showing content
export const isPublicRoute = (pathname: string): boolean =>
  pathname.startsWith("/studio"); 