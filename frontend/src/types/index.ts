// ========== USER TYPES ==========
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'farmer' | 'admin';
  createdAt: Date;
  first_name?: string;
  username?: string;
}

// ========== BANANA DETECTION TYPES (Synchronized with Backend) ==========
export interface BoundingBox {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  ripeness: string;
  confidence: number;
  centroid?: [number, number];
  area?: number;
  quality_score?: number;
}

export interface RipenessDistribution {
  not_mature: number;
  mature: number;
  ripe: number;
  over_ripe: number;
}

export interface ProcessingMetadata {
  model_version: string;
  processing_time: number;
  analysis_mode: 'fast' | 'standard' | 'high_recall';
  confidence_threshold: number;
  has_segmentation?: boolean;
}

// ========== SCAN RESULT TYPES ==========
export interface ScanResult {
  id: string;
  userId: string;
  timestamp: Date;
  image: string;
  ripeness: 'Not Mature' | 'Mature' | 'Ripe' | 'Over Ripe';
  bananaCount: number;
  confidence: number;
  ripenessResults?: Array<{
    ripeness: string;
    confidence: number;
    bbox?: [number, number, number, number];
  }>;
  // Enhanced fields synchronized with backend
  ripenessDistribution?: RipenessDistribution;
  processingMetadata?: ProcessingMetadata;
  qualityScore?: number;
  errorMessage?: string;
}

// ========== API RESPONSE TYPES ==========
export interface PredictionApiResponse {
  id: number;
  image_url: string;
  total_count: number;
  ripeness_distribution: RipenessDistribution;
  confidence: number;
  bounding_boxes: BoundingBox[];
  processed_at: string;
  processing_metadata: ProcessingMetadata;
}

export interface ScanRecordApiResponse {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  image: string;
  image_url: string;
  timestamp: string;
  banana_count: number;
  ripeness_results: BoundingBox[];
  avg_confidence: number;
  ripeness: string;
  ripeness_distribution: RipenessDistribution;
  dominant_ripeness: string;
  analysis_mode: string;
  processing_time: number;
  model_version: string;
  confidence_threshold: number;
  quality_score: number | null;
  has_segmentation: boolean;
  success_rate: number;
  error_message: string | null;
  retry_count: number;
  image_metadata: Record<string, any>;
}

// ========== ANALYTICS TYPES ==========
export interface RipenessData {
  label: string;
  count: number;
  color: string;
}

export interface AnalyticsData {
  totalScans: number;
  totalBananas: number;
  averageConfidence: number;
  ripenessBreakdown: RipenessData[];
  scanHistory: ScanResult[];
  lastScanDate?: string;
}

export interface AdminAnalyticsData {
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

// ========== ERROR HANDLING TYPES ==========
export interface ApiError {
  error: string;
  details: string;
  technical_details?: string;
  timestamp?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

// ========== FORM TYPES ==========
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
}

// ========== SYSTEM TYPES ==========
export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  category: string;
  data_type: 'string' | 'boolean' | 'integer' | 'float';
  updated_at: string;
  updated_by: number | null;
}

export interface ActivityLog {
  id: number;
  user: number | null;
  username: string;
  action: string;
  description: string;
  ip_address: string | null;
  timestamp: string;
  metadata: Record<string, any>;
}

// ========== DASHBOARD TYPES ==========
export interface DashboardOverview {
  totalUsers: number;
  activeUsers: number;
  totalScans: number;
  newThisMonth: number;
  systemUptime: string;
}