'use client';
import { create } from 'zustand';
import { type User } from '@/types';
import { setToken, removeToken, getToken } from '@/lib/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? getToken() : null,
  login: async (_email: string, _password: string) => {
    // Mock login
    const mockUser: User = { id: 'd1', companyId: 'c1', email: _email, name: 'Admin', role: 'ADMIN' as any };
    const mockToken = 'mock-jwt-token-' + Date.now();
    setToken(mockToken);
    set({ user: mockUser, token: mockToken });
  },
  logout: () => {
    removeToken();
    set({ user: null, token: null });
  },
  isAuthenticated: () => !!get().token,
}));
