/**
 * Custom hook for banana prediction functionality
 * Centralizes ML prediction logic and state management
 */

import { useState, useCallback } from 'react';
import { ScanResult } from '@/types';
import { analyzeBananaWithML } from '@/utils/analyzeBanana';
import { toast } from '@/hooks/use-toast';
import useApiError from './useApiError';

interface UsePredictionOptions {
  onSuccess?: (result: ScanResult) => void;
  onError?: (error: any) => void;
  defaultMode?: 'fast' | 'standard' | 'high_recall';
}

interface UsePredictionReturn {
  result: ScanResult | null;
  isAnalyzing: boolean;
  error: string | null;
  hasError: boolean;
  analyze: (imageFile: File, userId: string, mode?: 'fast' | 'standard' | 'high_recall') => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

export const usePrediction = (options: UsePredictionOptions = {}): UsePredictionReturn => {
  const {
    onSuccess,
    onError,
    defaultMode = 'standard'
  } = options;

  const [result, setResult] = useState<ScanResult | null>(null);
  
  const {
    error,
    isLoading: isAnalyzing,
    hasError,
    clearError,
    executeWithErrorHandling
  } = useApiError();

  const analyze = useCallback(async (
    imageFile: File, 
    userId: string, 
    mode: 'fast' | 'standard' | 'high_recall' = defaultMode
  ) => {
    console.group('🤖 Prediction Hook: Starting Analysis');
    console.log('Input:', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type,
      userId: userId,
      mode: mode,
      timestamp: new Date().toISOString()
    });

    const analysisResult = await executeWithErrorHandling(async () => {
      // Use the real ML analysis
      const result = await analyzeBananaWithML(imageFile, mode);
      
      // Set user ID
      result.userId = userId;
      
      console.log('✅ Analysis completed:', {
        id: result.id,
        bananaCount: result.bananaCount,
        confidence: result.confidence,
        ripeness: result.ripeness
      });

      setResult(result);

      // Success callback
      if (onSuccess) {
        onSuccess(result);
      }

      // Success toast
      toast({
        title: "Analysis Complete! 🎉",
        description: `Found ${result.bananaCount} banana(s) with ${result.confidence}% confidence.`,
        variant: "default",
      });

      console.groupEnd();
      return result;
    }, 'Banana Prediction', false); // Don't show toast here, we handle it manually

    // Handle errors
    if (!analysisResult && hasError) {
      console.groupEnd();
      if (onError) {
        onError(error);
      }
    }
  }, [executeWithErrorHandling, onSuccess, onError, defaultMode, hasError, error]);

  const reset = useCallback(() => {
    console.log('🔄 Resetting prediction state...');
    setResult(null);
    clearError();
    console.log('✅ Prediction state reset');
  }, [clearError]);

  return {
    result,
    isAnalyzing,
    error,
    hasError,
    analyze,
    reset,
    clearError,
  };
};

export default usePrediction;