"use client";

import { AuthProvider } from "../lib/propelauth";
import { AUTH_URL } from "../lib/propelauth";
import { useAuth } from "../hooks/useAuth";

interface AuthWrapperProps {
  children: React.ReactNode;
}

// Component to initialize axios authentication
function AxiosAuthInitializer() {
  useAuth(); // This will initialize axios with authentication
  return null;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  return (
    <AuthProvider authUrl={AUTH_URL}>
      <AxiosAuthInitializer />
      {children}
    </AuthProvider>
  );
}
