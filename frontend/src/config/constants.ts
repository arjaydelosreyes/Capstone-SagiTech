/**
 * Centralized Configuration Constants for SagiTech
 * Single source of truth for all application constants
 */

// ========== API CONFIGURATION ==========
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second base delay
} as const;

// ========== BANANA DETECTION CONSTANTS ==========
export const BANANA_DETECTION = {
  // Exact class names from YOLOv8 model (DO NOT CHANGE)
  RIPENESS_CLASSES: {
    NOT_MATURE: 'Not Mature',
    MATURE: 'Mature', 
    RIPE: 'Ripe',
    OVER_RIPE: 'Over Ripe'
  },
  
  // Analysis modes
  ANALYSIS_MODES: {
    FAST: 'fast',
    STANDARD: 'standard', 
    HIGH_RECALL: 'high_recall'
  },
  
  // Confidence thresholds
  CONFIDENCE_THRESHOLDS: {
    MINIMUM: 0.5,
    GOOD: 0.7,
    EXCELLENT: 0.9
  },
  
  // File constraints
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  
  // Processing constraints
  MAX_IMAGE_DIMENSION: 1024, // Optimal for YOLO
  JPEG_QUALITY: 0.85
} as const;

// ========== UI CONSTANTS ==========
export const UI_CONFIG = {
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Debounce delays
  SEARCH_DEBOUNCE: 300, // ms
  API_DEBOUNCE: 500, // ms
  
  // Animation durations
  FADE_DURATION: 300, // ms
  SLIDE_DURATION: 250, // ms
  
  // Breakpoints (Tailwind compatible)
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    XXL: 1536
  }
} as const;

// ========== RIPENESS STYLING ==========
export const RIPENESS_STYLES = {
  'Not Mature': {
    color: 'hsl(120, 70%, 45%)', // Green
    badgeClass: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-600 dark:text-green-400'
  },
  'Mature': {
    color: 'hsl(60, 90%, 50%)', // Yellow
    badgeClass: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-600 dark:text-yellow-400'
  },
  'Ripe': {
    color: 'hsl(30, 90%, 55%)', // Orange
    badgeClass: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-600 dark:text-orange-400'
  },
  'Over Ripe': {
    color: 'hsl(15, 70%, 50%)', // Brown/Red
    badgeClass: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-600 dark:text-red-400'
  }
} as const;

// ========== VALIDATION PATTERNS ==========
export const VALIDATION = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, // At least one lowercase, uppercase, and digit
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/ // Alphanumeric and underscore only
  }
} as const;

// ========== ERROR MESSAGES ==========
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection and try again.',
  AUTH_EXPIRED: 'Your session has expired. Please log in again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FILE_TOO_LARGE: 'File is too large. Please select an image under 10MB.',
  INVALID_FORMAT: 'Invalid file format. Please select a JPEG, PNG, or WebP image.',
  PREDICTION_FAILED: 'Failed to analyze image. Please try again.',
  GENERIC: 'An unexpected error occurred. Please try again.',
  
  // Field validation
  EMAIL_INVALID: 'Please enter a valid email address.',
  PASSWORD_WEAK: 'Password must be at least 8 characters with uppercase, lowercase, and numbers.',
  USERNAME_INVALID: 'Username must be 3-30 characters and contain only letters, numbers, and underscores.',
} as const;

// ========== SUCCESS MESSAGES ==========
export const SUCCESS_MESSAGES = {
  LOGIN: 'Welcome back!',
  REGISTER: 'Account created successfully!',
  PREDICTION_COMPLETE: 'Analysis completed successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
  EXPORT_COMPLETE: 'Export completed successfully!',
} as const;

// ========== FEATURE FLAGS ==========
export const FEATURES = {
  CAMERA_ENABLED: true,
  BATCH_ANALYSIS: false, // Future feature
  REAL_TIME_ANALYSIS: false, // Future feature
  ADVANCED_ANALYTICS: true,
  EXPORT_FUNCTIONALITY: true,
  DARK_MODE: true,
} as const;

// ========== PERFORMANCE SETTINGS ==========
export const PERFORMANCE = {
  // Image optimization
  IMAGE_LAZY_LOADING: true,
  IMAGE_COMPRESSION: true,
  
  // Component optimization  
  VIRTUAL_SCROLLING_THRESHOLD: 100, // Items
  DEBOUNCE_SEARCH: true,
  MEMOIZE_EXPENSIVE_CALCULATIONS: true,
  
  // API optimization
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  PREFETCH_ENABLED: false, // Disabled for now
} as const;

// ========== DEVELOPMENT SETTINGS ==========
export const DEV_CONFIG = {
  ENABLE_CONSOLE_GROUPS: process.env.NODE_ENV === 'development',
  ENABLE_PERFORMANCE_MONITORING: process.env.NODE_ENV === 'development',
  MOCK_API_DELAY: 1000, // ms for development
} as const;

// Helper functions
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export const isValidRipeness = (ripeness: string): boolean => {
  return Object.values(BANANA_DETECTION.RIPENESS_CLASSES).includes(ripeness as any);
};

export const getRipenessStyle = (ripeness: string) => {
  return RIPENESS_STYLES[ripeness as keyof typeof RIPENESS_STYLES] || RIPENESS_STYLES['Mature'];
};

export default {
  API_CONFIG,
  BANANA_DETECTION,
  UI_CONFIG,
  RIPENESS_STYLES,
  VALIDATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FEATURES,
  PERFORMANCE,
  DEV_CONFIG
};