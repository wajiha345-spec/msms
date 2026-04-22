import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30s — enough for image uploads to Cloudinary
  headers: { 'Content-Type': 'application/json' },
});