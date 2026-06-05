import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('mc_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mc_token');
      localStorage.removeItem('mc_user');
      window.location.href = '/auth';
    }
    return Promise.reject(err);
  }
);

export default api;
