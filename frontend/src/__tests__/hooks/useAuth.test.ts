/**
 * Unit tests for useAuth hook
 */

import { renderHook, act } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn()
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}));

const mockNavigate = jest.fn();
const mockToast = jest.fn();

describe('useAuth Hook', () => {
  beforeEach(() => {
    // Reset mocks
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (toast as jest.Mock).mockImplementation(mockToast);
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset function mocks
    mockNavigate.mockClear();
    mockToast.mockClear();
  });

  describe('Authentication Check', () => {
    it('should redirect to login when no user data exists', () => {
      renderHook(() => useAuth());
      
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should set user when valid data exists', () => {
      const userData = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'farmer'
      };
      
      localStorage.setItem('sagitech-user', JSON.stringify(userData));
      localStorage.setItem('sagitech-token', 'valid-token');
      
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.user).toEqual(userData);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle invalid JSON in localStorage', () => {
      localStorage.setItem('sagitech-user', 'invalid-json');
      localStorage.setItem('sagitech-token', 'valid-token');
      
      renderHook(() => useAuth());
      
      expect(mockNavigate).toHaveBeenCalledWith('/login');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Authentication Error",
        description: "Invalid session data. Please log in again.",
        variant: "destructive",
      });
    });
  });

  describe('Role-based Access', () => {
    it('should redirect when user role does not match required role', () => {
      const userData = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'farmer'
      };
      
      localStorage.setItem('sagitech-user', JSON.stringify(userData));
      localStorage.setItem('sagitech-token', 'valid-token');
      
      renderHook(() => useAuth({ requiredRole: 'admin' }));
      
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/farmer');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Access Denied",
        description: "This page requires admin role.",
        variant: "destructive",
      });
    });

    it('should allow access when user role matches required role', () => {
      const userData = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
      };
      
      localStorage.setItem('sagitech-user', JSON.stringify(userData));
      localStorage.setItem('sagitech-token', 'valid-token');
      
      const { result } = renderHook(() => useAuth({ requiredRole: 'admin' }));
      
      expect(result.current.user).toEqual(userData);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Logout Functionality', () => {
    it('should clear all auth data and redirect on logout', () => {
      const userData = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'farmer'
      };
      
      localStorage.setItem('sagitech-user', JSON.stringify(userData));
      localStorage.setItem('sagitech-token', 'valid-token');
      localStorage.setItem('sagitech-tokens', JSON.stringify({ refresh: 'refresh-token' }));
      
      const { result } = renderHook(() => useAuth());
      
      act(() => {
        result.current.logout();
      });
      
      expect(localStorage.getItem('sagitech-user')).toBeNull();
      expect(localStorage.getItem('sagitech-token')).toBeNull();
      expect(localStorage.getItem('sagitech-tokens')).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});