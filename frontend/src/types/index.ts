export interface User {
  id: string;
  email: string;
  name: string;
  role: 'farmer' | 'admin';
  createdAt: Date;
  first_name?: string;
  username?: string;
}

export interface RipenessDetection {
  ripeness: 'Not Mature' | 'Mature' | 'Ripe' | 'Over Ripe';
  confidence: number;
  bbox?: number[]; // [x1, y1, x2, y2] bounding box coordinates
}

export interface RipenessBreakdown {
  count: number;
  percentage: number;
}

export interface ScanResult {
  id: string;
  userId: string;
  timestamp: Date;
  image: string;
  ripeness: 'Not Mature' | 'Mature' | 'Ripe' | 'Over Ripe'; // Dominant ripeness
  bananaCount: number;
  confidence: number;
  ripenessResults?: RipenessDetection[]; // Individual banana detections
  ripenessDistribution?: Record<string, number>; // {"Not Mature": 2, "Mature": 3, "Ripe": 1}
  ripenessBreakdown?: Record<string, RipenessBreakdown>; // Detailed breakdown with percentages
  overallRipeness?: string; // Most prevalent ripeness level
  notMatureCount?: number;
  matureCount?: number;
  ripeCount?: number;
  overRipeCount?: number;
}

export interface RipenessData {
  label: string;
  count: number;
  color: string;
  percentage?: number;
}

export interface RipenessBadgeProps {
  ripeness: string;
  count: number;
  percentage?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  showPercentage?: boolean;
}

export interface AnalyticsData {
  totalScans: number;
  totalBananas: number;
  averageConfidence: number;
  ripenessBreakdown: RipenessData[];
  scanHistory: ScanResult[];
}