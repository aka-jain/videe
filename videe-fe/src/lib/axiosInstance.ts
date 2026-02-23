import axios from 'axios';
import { VIDEO_GENIE_API_BASE_URL } from './apiEndpoints';

/**
 * Authenticated Axios Instance
 * 
 * This axios instance automatically handles authentication for all API requests:
 * - Adds Bearer tokens to outgoing requests
 * - Handles 401 responses with automatic logout
 * - Queues failed requests during token refresh
 * 
 * Usage in components:
 * ```typescript
 * import axiosInstance from '@/lib/axiosInstance';
 * 
 * const MyComponent = () => {
 *   const fetchData = async () => {
 *     try {
 *       const response = await axiosInstance.get('/api/protected-endpoint');
 *       console.log(response.data);
 *     } catch (error) {
 *       console.error('API call failed:', error);
 *     }
 *   };
 * 
 *   return <button onClick={fetchData}>Fetch Protected Data</button>;
 * };
 * ```
 * 
 * The authentication is automatically initialized by the AuthWrapper component.
 */

const axiosInstance = axios.create({
  baseURL: VIDEO_GENIE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Variable to track if we're currently refreshing
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Function to initialize axios with authentication
export const initializeAxiosAuth = (getAccessToken: () => string | null, logout: (redirectToLogin?: boolean) => void) => {
  // Clear any existing interceptors to avoid duplicates
  axiosInstance.interceptors.request.clear();
  axiosInstance.interceptors.response.clear();

  // Request interceptor to add access token
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle 401 errors and token refresh
  axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // If we're already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => {
            return axiosInstance(originalRequest);
          }).catch(err => {
            return Promise.reject(err);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Try to get a fresh token
          const newToken = getAccessToken();

          if (newToken) {
            processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axiosInstance(originalRequest);
          } else {
            // If no token available, logout
            processQueue(new Error('No access token available'), null);
            logout(true);
            return Promise.reject(error);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          logout(true);
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
};

export default axiosInstance; 