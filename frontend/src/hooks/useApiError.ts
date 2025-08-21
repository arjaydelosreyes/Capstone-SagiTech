/**
 * Custom hook for consistent API error handling
 * Provides centralized error management and user feedback
 */

import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export interface ApiErrorState {
  error: string | null;
  isLoading: boolean;
  hasError: boolean;
}

export interface ApiErrorHandlers {
  handleError: (error: any, context?: string) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  executeWithErrorHandling: <T>(
    operation: () => Promise<T>,
    context?: string,
    showToast?: boolean
  ) => Promise<T | null>;
}

export const useApiError = (): ApiErrorState & ApiErrorHandlers => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((error: any, context?: string) => {
    console.group(`🔴 API Error Handler${context ? `: ${context}` : ''}`);
    console.error('Error:', error);
    console.error('Context:', context);
    console.error('Timestamp:', new Date().toISOString());
    console.error('Stack:', error?.stack);
    console.groupEnd();

    let errorMessage = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.detail) {
      errorMessage = error.detail;
    } else if (error?.error) {
      errorMessage = error.error;
    }

    setError(errorMessage);
    setIsLoading(false);

    // Show user-friendly toast notification
    toast({
      title: context ? `${context} Failed` : "Error",
      description: errorMessage,
      variant: "destructive",
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setLoadingState = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (loading) {
      clearError(); // Clear previous errors when starting new operation
    }
  }, [clearError]);

  const executeWithErrorHandling = useCallback(async <T,>(
    operation: () => Promise<T>,
    context?: string,
    showToast: boolean = true
  ): Promise<T | null> => {
    try {
      setLoadingState(true);
      clearError();
      
      const result = await operation();
      
      setIsLoading(false);
      return result;
    } catch (error) {
      if (showToast) {
        handleError(error, context);
      } else {
        console.error(`Silent error in ${context}:`, error);
        setError(error instanceof Error ? error.message : 'Operation failed');
        setIsLoading(false);
      }
      return null;
    }
  }, [handleError, clearError, setLoadingState]);

  return {
    error,
    isLoading,
    hasError: !!error,
    handleError,
    clearError,
    setLoading: setLoadingState,
    executeWithErrorHandling,
  };
};

export default useApiError;