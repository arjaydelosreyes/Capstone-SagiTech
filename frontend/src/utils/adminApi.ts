import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({ baseURL: API_BASE_URL });

// Add request interceptor to attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('sagitech-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = JSON.parse(localStorage.getItem('sagitech-tokens') || '{}');
      const refresh = tokens.refresh;
      if (refresh) {
        try {
          const res = await axios.post<any>(`${API_BASE_URL}/token/refresh/`, { refresh });
          const newAccess = res.data.access;
          localStorage.setItem('sagitech-token', newAccess);
          // Update the Authorization header and retry the original request
          originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, force logout
          localStorage.removeItem('sagitech-token');
          localStorage.removeItem('sagitech-tokens');
          localStorage.removeItem('sagitech-user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, force logout
        localStorage.removeItem('sagitech-token');
        localStorage.removeItem('sagitech-tokens');
        localStorage.removeItem('sagitech-user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const adminApi = {
  getSettingsByCategory: () => api.get('/settings/by_category/'),
  updateSetting: (id: number, data: any) => api.put(`/settings/${id}/`, data),
  getRecentActivity: () => api.get('/activity/recent/'),
  getDashboardOverview: () => api.get('/dashboard/overview/'),
  getAllUsers: () => api.get('/profiles/'),
  getAnalyticsOverview: () => api.get('/analytics/overview/'),
}; 