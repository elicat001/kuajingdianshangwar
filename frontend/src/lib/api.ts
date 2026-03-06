import axios from 'axios';
import { message } from 'antd';
import { getToken, removeToken } from './auth';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const msg = error.response?.data?.message;

    if (status === 401) {
      removeToken();
      if (typeof window !== 'undefined') {
        message.error('登录已过期，请重新登录');
        window.location.href = '/login';
      }
    } else if (status === 429) {
      message.error('请求过于频繁，请稍后再试');
    } else if (status >= 500) {
      message.error(msg || '服务器错误，请稍后再试');
    }

    return Promise.reject(error);
  },
);

export default api;
