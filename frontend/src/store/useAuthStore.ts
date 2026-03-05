'use client';
import { create } from 'zustand';
import { type User } from '@/types';
import { setToken, removeToken, getToken } from '@/lib/auth';
import api from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? getToken() : null,
  loading: false,
  error: null,
  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, user } = res.data;
      setToken(accessToken);
      set({ user, token: accessToken, loading: false });
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed';
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
  register: async (email: string, password: string, name: string) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/register', { email, password, name });
      const { accessToken, user } = res.data;
      setToken(accessToken);
      set({ user, token: accessToken, loading: false });
    } catch (err: any) {
      const message = err.response?.data?.message || 'Registration failed';
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
  logout: () => {
    removeToken();
    set({ user: null, token: null });
  },
  isAuthenticated: () => !!get().token,
}));
