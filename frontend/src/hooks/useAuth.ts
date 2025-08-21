/**
 * Custom hook for authentication management
 * Eliminates duplicate user state and navigation logic across components
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types';
import { toast } from '@/hooks/use-toast';

interface UseAuthOptions {
  requiredRole?: 'farmer' | 'admin';
  redirectTo?: string;
  showErrorToast?: boolean;
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refreshUser: () => void;
}

export const useAuth = (options: UseAuthOptions = {}): UseAuthReturn => {
  const {
    requiredRole,
    redirectTo = '/login',
    showErrorToast = true
  } = options;

  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = () => {
    console.group('🔐 User Logout');
    console.log('User:', user?.username);
    console.log('Timestamp:', new Date().toISOString());
    
    // Clear all authentication data
    localStorage.removeItem("sagitech-token");
    localStorage.removeItem("sagitech-tokens");
    localStorage.removeItem("sagitech-user");
    
    setUser(null);
    navigate('/login');
    
    if (showErrorToast) {
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
        variant: "default",
      });
    }
    
    console.groupEnd();
  };

  const refreshUser = () => {
    console.log('🔄 Refreshing user data...');
    
    try {
      const userData = localStorage.getItem("sagitech-user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        console.log('✅ User data refreshed:', parsedUser.username);
      } else {
        setUser(null);
        console.log('⚠️ No user data found');
      }
    } catch (error) {
      console.error('❌ Failed to parse user data:', error);
      logout();
    }
  };

  useEffect(() => {
    console.group('🔐 Authentication Check');
    console.log('Required Role:', requiredRole);
    console.log('Redirect To:', redirectTo);
    
    try {
      const userData = localStorage.getItem("sagitech-user");
      const token = localStorage.getItem("sagitech-token");
      
      console.log('Has Token:', !!token);
      console.log('Has User Data:', !!userData);
      
      if (!userData || !token) {
        console.log('❌ No authentication data found');
        setUser(null);
        setIsLoading(false);
        navigate(redirectTo);
        console.groupEnd();
        return;
      }

      const parsedUser = JSON.parse(userData);
      console.log('User:', parsedUser.username, 'Role:', parsedUser.role);
      
      // Check role requirements
      if (requiredRole && parsedUser.role !== requiredRole) {
        console.log(`❌ Role mismatch: required ${requiredRole}, got ${parsedUser.role}`);
        
        if (showErrorToast) {
          toast({
            title: "Access Denied",
            description: `This page requires ${requiredRole} role.`,
            variant: "destructive",
          });
        }
        
        // Redirect to appropriate dashboard
        const correctDashboard = parsedUser.role === 'admin' 
          ? '/dashboard/admin' 
          : '/dashboard/farmer';
        navigate(correctDashboard);
        console.groupEnd();
        return;
      }

      setUser(parsedUser);
      console.log('✅ Authentication successful');
      
    } catch (error) {
      console.error('❌ Authentication error:', error);
      
      if (showErrorToast) {
        toast({
          title: "Authentication Error",
          description: "Invalid session data. Please log in again.",
          variant: "destructive",
        });
      }
      
      logout();
    } finally {
      setIsLoading(false);
      console.groupEnd();
    }
  }, [navigate, requiredRole, redirectTo, showErrorToast]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    refreshUser,
  };
};

export default useAuth;