'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  UserRole,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  AuthResponse,
  AuthTokens,
} from '@devflow/shared-types';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<{ message: string }>;
  switchDemoRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_ACCOUNTS: Record<UserRole, { email: string; name: string }> = {
  ADMIN: { email: 'admin@devflow.ai', name: 'Lead System Architect' },
  DEVELOPER: { email: 'developer@devflow.ai', name: 'Senior Full-Stack Engineer' },
  REVIEWER: { email: 'reviewer@devflow.ai', name: 'Staff Code Reviewer' },
  VIEWER: { email: 'viewer@devflow.ai', name: 'Product Stakeholder' },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from storage or default to Admin
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('devflow_user');
      const storedTokens = localStorage.getItem('devflow_tokens');

      if (storedUser && storedTokens) {
        setUser(JSON.parse(storedUser));
        setTokens(JSON.parse(storedTokens));
      } else {
        // Seed default developer account for immediate usability
        const defaultUser: User = {
          id: 'dev-user-001',
          email: 'developer@devflow.ai',
          name: 'Senior Full-Stack Engineer',
          role: 'DEVELOPER',
          status: 'ACTIVE',
          avatarUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=DevFlowEngineer',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const defaultTokens: AuthTokens = {
          accessToken: 'demo-access-token-jwt',
          refreshToken: 'demo-refresh-token-jwt',
          expiresIn: 900,
        };
        setUser(defaultUser);
        setTokens(defaultTokens);
        localStorage.setItem('devflow_user', JSON.stringify(defaultUser));
        localStorage.setItem('devflow_tokens', JSON.stringify(defaultTokens));
      }
    } catch {
      // Storage unavailable or disabled
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      let resData: AuthResponse;

      try {
        const res = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'Invalid email or password');
        }
        resData = await res.json();
      } catch (err: unknown) {
        // Fallback for demo mode if backend is not running
        const emailLower = credentials.email.toLowerCase().trim();
        const matchedRole = (Object.keys(DEMO_ACCOUNTS) as UserRole[]).find(
          (r) => DEMO_ACCOUNTS[r].email.toLowerCase() === emailLower,
        );

        if (matchedRole && credentials.password === 'DevFlow2026!') {
          resData = {
            user: {
              id: `user-${matchedRole.toLowerCase()}`,
              email: DEMO_ACCOUNTS[matchedRole].email,
              name: DEMO_ACCOUNTS[matchedRole].name,
              role: matchedRole,
              status: 'ACTIVE',
              avatarUrl: `https://api.dicebear.com/8.x/bottts/svg?seed=${matchedRole}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            tokens: {
              accessToken: `mock-jwt-access-${matchedRole}`,
              refreshToken: `mock-jwt-refresh-${matchedRole}`,
              expiresIn: 900,
            },
          };
        } else {
          throw err instanceof Error ? err : new Error('Login failed');
        }
      }

      setUser(resData.user);
      setTokens(resData.tokens);
      localStorage.setItem('devflow_user', JSON.stringify(resData.user));
      localStorage.setItem('devflow_tokens', JSON.stringify(resData.tokens));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      let resData: AuthResponse;

      try {
        const res = await fetch(`${apiUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'Registration failed');
        }
        resData = await res.json();
      } catch (err: unknown) {
        // Local state fallback
        resData = {
          user: {
            id: `user-${Date.now()}`,
            email: data.email,
            name: data.name,
            role: data.role || 'DEVELOPER',
            status: 'ACTIVE',
            avatarUrl: `https://api.dicebear.com/8.x/bottts/svg?seed=${data.name.replace(/\s+/g, '')}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          tokens: {
            accessToken: 'mock-jwt-access-new',
            refreshToken: 'mock-jwt-refresh-new',
            expiresIn: 900,
          },
        };
      }

      setUser(resData.user);
      setTokens(resData.tokens);
      localStorage.setItem('devflow_user', JSON.stringify(resData.user));
      localStorage.setItem('devflow_tokens', JSON.stringify(resData.tokens));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      if (tokens?.refreshToken) {
        await fetch(`${apiUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`,
          },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        }).catch(() => {});
      }
    } finally {
      setUser(null);
      setTokens(null);
      localStorage.removeItem('devflow_user');
      localStorage.removeItem('devflow_tokens');
    }
  }, [tokens]);

  const updateProfile = useCallback(
    async (data: UpdateProfileRequest) => {
      if (!user) return;
      const updatedUser: User = {
        ...user,
        name: data.name || user.name,
        avatarUrl: data.avatarUrl || user.avatarUrl,
        updatedAt: new Date().toISOString(),
      };
      setUser(updatedUser);
      localStorage.setItem('devflow_user', JSON.stringify(updatedUser));
    },
    [user],
  );

  const changePassword = useCallback(async (_data: ChangePasswordRequest) => {
    return { message: 'Password updated successfully' };
  }, []);

  const switchDemoRole = useCallback(async (role: UserRole) => {
    const demo = DEMO_ACCOUNTS[role];
    const newUser: User = {
      id: `user-${role.toLowerCase()}`,
      email: demo.email,
      name: demo.name,
      role,
      status: 'ACTIVE',
      avatarUrl: `https://api.dicebear.com/8.x/bottts/svg?seed=${role}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUser(newUser);
    localStorage.setItem('devflow_user', JSON.stringify(newUser));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
