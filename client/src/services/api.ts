import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30s timeout
});

// Request interceptor - har request me token aur team access info lagao
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Team access mode mein board ID aur access level header mein bhejo
  const teamAccess = localStorage.getItem('teamAccess');
  if (teamAccess) {
    try {
      const parsed = JSON.parse(teamAccess);
      if (parsed?.boardId) config.headers['x-team-board-id'] = parsed.boardId;
      if (parsed?.accessLevel) config.headers['x-team-access-level'] = parsed.accessLevel;
    } catch { /* ignore */ }
  }
  return config;
});

// Response interceptor - 401 pe token refresh karo aur retry karo
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Team access revoked — server sends specific code when boardMember deleted
    if (error.response?.status === 403 && error.response?.data?.code === 'TEAM_ACCESS_REVOKED') {
      localStorage.removeItem('teamAccess');
      window.location.href = '/user/roadmap';
      return Promise.reject(error);
    }

    // Skip refresh for auth endpoints
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh-token') ||
      originalRequest.url?.includes('/auth/google')
    ) {
      return Promise.reject(error);
    }

    // Token expired - try refresh
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      isRefreshing = false;
      // No refresh token - logout
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh-token`,
        { refreshToken }
      );
      const newToken = res.data.data.accessToken;
      localStorage.setItem('accessToken', newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Refresh failed - logout
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
