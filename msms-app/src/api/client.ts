import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15s default; secondhand upload overrides per-request if needed
  headers: { 'Content-Type': 'application/json' },
});

// A stale/invalid token (expired, or rejected after a backend secret/session
// change) otherwise leaves the user stuck on a broken screen with a raw
// "Invalid or expired token" error and no way back to Login. AuthContext
// registers a handler here that clears the session on any 401 so the app
// falls back to the Login screen automatically.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);