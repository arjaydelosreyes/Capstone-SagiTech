/**
 * Centralized API Service for SagiTech
 * Single source of truth for all API calls with comprehensive error handling
 */

import { toast } from "@/hooks/use-toast";

const API_BASE_URL = 'http://localhost:8000/api';

// Centralized error logging
const logError = (context: string, error: any, additionalData?: any) => {
  console.group(`🔴 API Error: ${context}`);
  console.error('Error:', error);
  console.error('Timestamp:', new Date().toISOString());
  console.error('Context:', context);
  if (additionalData) {
    console.error('Additional Data:', additionalData);
  }
  if (error.stack) {
    console.error('Stack Trace:', error.stack);
  }
  console.groupEnd();
};

// Enhanced fetch with auto-retry and comprehensive error handling
const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const token = localStorage.getItem("sagitech-token");
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      // Handle 401 - Token refresh
      if (response.status === 401 && attempt === 0) {
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          attempt++;
          continue; // Retry with new token
        } else {
          throw new Error("Session expired. Please log in again.");
        }
      }

      // Handle other HTTP errors
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.clone().json();
          if (errorData.detail) errorMessage = errorData.detail;
          else if (errorData.error) errorMessage = errorData.error;
          else if (errorData.message) errorMessage = errorData.message;
        } catch {
          // Fallback to status text if JSON parsing fails
        }
        throw new Error(errorMessage);
      }

      return response;
    } catch (error) {
      attempt++;
      
      if (attempt >= maxRetries) {
        logError(`API Request Failed (${url})`, error, { 
          method: options.method || 'GET',
          attempts: attempt 
        });
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error("Max retries exceeded");
};

// Token refresh logic
const refreshToken = async (): Promise<boolean> => {
  try {
    const tokens = JSON.parse(localStorage.getItem("sagitech-tokens") || '{}');
    const refresh = tokens.refresh;
    
    if (!refresh) {
      clearAuthData();
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("sagitech-token", data.access);
      return true;
    } else {
      clearAuthData();
      return false;
    }
  } catch (error) {
    logError("Token Refresh", error);
    clearAuthData();
    return false;
  }
};

// Clear authentication data
const clearAuthData = () => {
  localStorage.removeItem("sagitech-token");
  localStorage.removeItem("sagitech-tokens");
  localStorage.removeItem("sagitech-user");
  window.location.href = '/login';
};

// API Response types
export interface PredictionResponse {
  id: number;
  image_url: string;
  total_count: number;
  ripeness_distribution: {
    not_mature: number;
    mature: number;
    ripe: number;
    over_ripe: number;
  };
  confidence: number;
  bounding_boxes: Array<{
    bbox: [number, number, number, number];
    ripeness: string;
    confidence: number;
    centroid?: [number, number];
    area?: number;
    quality_score?: number;
  }>;
  processed_at: string;
  processing_metadata: {
    model_version: string;
    processing_time: number;
    analysis_mode: string;
    confidence_threshold: number;
    has_segmentation?: boolean;
  };
}

export interface ScanRecord {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  image: string;
  timestamp: string;
  banana_count: number;
  ripeness_results: Array<{
    ripeness: string;
    confidence: number;
    bbox?: [number, number, number, number];
  }>;
  avg_confidence: number;
  ripeness: string;
}

export interface AnalyticsOverview {
  totalScans: number;
  totalUsers: number;
  totalBananas: number;
  avgConfidence: number;
  ripenessDistribution: Record<string, number>;
  userGrowth: Array<{
    month: string;
    users: number;
    scans: number;
  }>;
  topPerformers: Array<{
    name: string;
    email: string;
    scans: number;
    accuracy: number;
  }>;
}

// Main API Service
export const apiService = {
  // ========== SINGLE ENDPOINT FOR PREDICTION ==========
  /**
   * Complete prediction pipeline in ONE endpoint
   * Handles: upload → process → return results
   */
  predict: async (imageFile: File, mode: 'fast' | 'standard' | 'high_recall' = 'standard'): Promise<PredictionResponse> => {
    console.group('🔍 Banana Prediction Analysis');
    console.log('Request:', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type,
      mode: mode,
      timestamp: new Date().toISOString()
    });

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('mode', mode);

      const response = await fetchWithAuth(`${API_BASE_URL}/predict/`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      console.log('Response:', data);
      console.log('Processing Time:', data.processing_metadata?.processing_time + 's');
      console.groupEnd();

      return data;
    } catch (error) {
      console.groupEnd();
      logError('Prediction API', error, { 
        fileName: imageFile.name, 
        fileSize: imageFile.size,
        mode: mode 
      });
      
      // Enhanced user-friendly error messages with WebP support
      let userMessage = 'Failed to analyze image. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('size') || error.message.includes('large')) {
          userMessage = 'Image is too large. Please use an image under 10MB.';
        } else if (error.message.includes('format') || error.message.includes('type')) {
          userMessage = 'Invalid image format. Please use JPG, PNG, or WebP.';
        } else if (error.message.includes('WebP') || error.message.includes('webp')) {
          userMessage = 'WebP format detected but invalid. Please ensure the WebP file is valid or convert to JPEG/PNG.';
        } else if (error.message.includes('model') || error.message.includes('detection')) {
          userMessage = 'AI detection service is temporarily unavailable. Please try again later.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          userMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('400')) {
          userMessage = 'Invalid image data. Please try a different image or convert to JPEG format.';
        } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
          userMessage = 'Session expired. Please log in again.';
        }
      }
      
      toast({
        title: "Prediction Failed",
        description: userMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  },

  // ========== SINGLE ENDPOINT FOR FETCHING SPECIFIC PREDICTION ==========
  getPrediction: async (id: number): Promise<PredictionResponse> => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/prediction/${id}/`);
      return await response.json();
    } catch (error) {
      logError('Get Prediction', error, { predictionId: id });
      throw error;
    }
  },

  // ========== SINGLE ENDPOINT FOR LISTING PREDICTIONS ==========
  listPredictions: async (page: number = 1): Promise<{ results: ScanRecord[], count: number, next: string | null, previous: string | null }> => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/scan-records/?page=${page}`);
      return await response.json();
    } catch (error) {
      logError('List Predictions', error, { page });
      throw error;
    }
  },

  // ========== SINGLE ENDPOINT FOR ANALYTICS ==========
  getAnalytics: async (): Promise<AnalyticsOverview> => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/analytics/overview/`);
      return await response.json();
    } catch (error) {
      logError('Get Analytics', error);
      throw error;
    }
  },

  // ========== AUTHENTICATION ENDPOINTS ==========
  register: async (userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<any> => {
    console.group('🔐 User Registration');
    console.log('Request:', { email: userData.email, name: userData.name });

    try {
      const username = userData.name.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 10000);
      
      const response = await fetch(`${API_BASE_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          email: userData.email, 
          password: userData.password, 
          role: 'farmer', 
          name: userData.name 
        }),
      });

      if (!response.ok) {
        let errorMsg = "Registration failed. Please check your details.";
        try {
          const data = await response.clone().json();
          if (typeof data === "string") errorMsg = data;
          else if (data.detail) errorMsg = data.detail;
          else if (data.error) errorMsg = data.error;
          else if (data.email && Array.isArray(data.email)) errorMsg = data.email[0];
          else if (data.username && Array.isArray(data.username)) errorMsg = data.username[0];
        } catch {
          try {
            const text = await response.text();
            if (text) errorMsg = text;
          } catch {}
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      console.log('Registration successful');
      console.groupEnd();
      return result;
    } catch (error) {
      console.groupEnd();
      logError('Registration', error, { email: userData.email });
      
      toast({
        title: "Registration Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred during registration.",
        variant: "destructive",
      });
      throw error;
    }
  },

  login: async (credentials: { email: string; password: string }): Promise<any> => {
    console.group('🔐 User Login');
    console.log('Request:', { email: credentials.email });

    try {
      const response = await fetch(`${API_BASE_URL}/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        let errorMsg = "Login failed. Please check your credentials.";
        try {
          const data = await response.clone().json();
          if (typeof data === "string") errorMsg = data;
          else if (data.detail) {
            if (data.detail === "No active account found with the given credentials") {
              errorMsg = "Incorrect email or password. Please try again.";
            } else {
              errorMsg = data.detail;
            }
          }
          else if (data.error) errorMsg = data.error;
        } catch {
          try {
            const text = await response.text();
            if (text) errorMsg = text;
          } catch {}
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      console.log('Login successful');
      console.groupEnd();
      return result;
    } catch (error) {
      console.groupEnd();
      logError('Login', error, { email: credentials.email });
      
      toast({
        title: "Login Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred during login.",
        variant: "destructive",
      });
      throw error;
    }
  },

  // ========== ADMIN ENDPOINTS ==========
  getDashboardOverview: async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/dashboard/overview/`);
      return await response.json();
    } catch (error) {
      logError('Dashboard Overview', error);
      throw error;
    }
  },

  getProfile: async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/profiles/me/`);
      return await response.json();
    } catch (error) {
      logError('Get Profile', error);
      throw error;
    }
  },

  // Settings management
  getSettingsByCategory: async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/settings/by_category/`);
      return await response.json();
    } catch (error) {
      logError('Get Settings', error);
      throw error;
    }
  },

  updateSetting: async (id: number, data: any) => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/settings/${id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      logError('Update Setting', error, { settingId: id, data });
      throw error;
    }
  },

  // Activity logs
  getRecentActivity: async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/activity/recent/`);
      return await response.json();
    } catch (error) {
      logError('Get Recent Activity', error);
      throw error;
    }
  },

  getAllUsers: async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/profiles/`);
      return await response.json();
    } catch (error) {
      logError('Get All Users', error);
      throw error;
    }
  },
};

// Export both named and default
export { apiService };
export default apiService;