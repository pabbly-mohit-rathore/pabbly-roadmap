// ============================================================
// AXIOS INSTANCE
// Ye ek ready-made HTTP client hai jo har API call mein:
//   - Base URL automatically lagata hai (localhost:5000)
//   - Token automatically header mein bhejta hai
// ============================================================

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Har request ke pehle token header mein daalo
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
