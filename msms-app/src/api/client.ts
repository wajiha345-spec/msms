import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15s default; secondhand upload overrides per-request if needed
  headers: { 'Content-Type': 'application/json' },
});