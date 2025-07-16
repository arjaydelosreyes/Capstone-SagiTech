export interface User {
  id: string;
  email: string;
  name: string;
  role: 'farmer' | 'admin';
  createdAt: Date;
  first_name?: string;
  username?: string;
}

export interface ScanResult {
  id: string;
  userId: string;
  timestamp: Date;
  image: string;
  ripeness: 'Not Mature' | 'Mature' | 'Ripe' | 'Over Ripe';
  bananaCount: number;
  confidence: number;
  ripenessResults?: { ripeness: string; confidence: number }[];
}

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
}