import { ScanResult } from "@/types";
import { apiService, PredictionResponse } from "@/services/ApiService";

const ripenessStages = ['Not Mature', 'Mature', 'Ripe', 'Over Ripe'] as const;

/**
 * DEPRECATED: Mock analysis function - replaced by real ML integration
 * Use apiService.predict() instead for actual banana analysis
 */
export const analyzeBanana = (image: string, userId: string): ScanResult => {
  console.warn("⚠️ DEPRECATED: Using mock analysis. Use apiService.predict() for real ML analysis.");
  
  // Mock AI analysis - simulates CNN processing
  const ripeness = ripenessStages[Math.floor(Math.random() * ripenessStages.length)];
  const bananaCount = Math.floor(Math.random() * 8) + 1; // 1-8 bananas
  const confidence = Math.floor(Math.random() * 26) + 70; // 70-95% confidence

  return {
    id: crypto.randomUUID(),
    userId,
    timestamp: new Date(),
    image,
    ripeness,
    bananaCount,
    confidence,
    ripenessResults: [{ ripeness, confidence }], // Always provide this for backend
  };
};

/**
 * NEW: Real ML analysis using unified API service
 * Replaces mock analysis with actual YOLOv8 model prediction
 */
export const analyzeBananaWithML = async (
  imageFile: File, 
  mode: 'fast' | 'standard' | 'high_recall' = 'standard'
): Promise<ScanResult> => {
  console.group('🤖 Real ML Banana Analysis');
  console.log('Input:', {
    fileName: imageFile.name,
    fileSize: imageFile.size,
    mode: mode,
    timestamp: new Date().toISOString()
  });

  try {
    // Call the single prediction endpoint
    const prediction = await apiService.predict(imageFile, mode);
    
    // Convert API response to ScanResult format
    const result: ScanResult = {
      id: prediction.id.toString(),
      userId: '', // Will be set by calling component
      timestamp: new Date(prediction.processed_at),
      image: prediction.image_url,
      ripeness: convertRipenessFromAPI(prediction.ripeness_distribution),
      bananaCount: prediction.total_count,
      confidence: prediction.confidence,
      ripenessResults: prediction.bounding_boxes.map(box => ({
        ripeness: box.ripeness,
        confidence: box.confidence,
        bbox: box.bbox
      }))
    };

    console.log('ML Analysis Result:', {
      totalBananas: result.bananaCount,
      dominantRipeness: result.ripeness,
      confidence: result.confidence,
      processingTime: prediction.processing_metadata.processing_time + 's'
    });
    console.groupEnd();

    return result;
  } catch (error) {
    console.groupEnd();
    console.error('🔴 ML Analysis Failed:', error);
    throw error;
  }
};

/**
 * Convert API ripeness distribution to dominant ripeness stage
 */
const convertRipenessFromAPI = (distribution: Record<string, number>): 'Not Mature' | 'Mature' | 'Ripe' | 'Over Ripe' => {
  const ripenessMap: Record<string, 'Not Mature' | 'Mature' | 'Ripe' | 'Over Ripe'> = {
    'not_mature': 'Not Mature',
    'mature': 'Mature', 
    'ripe': 'Ripe',
    'over_ripe': 'Over Ripe'
  };

  // Find the ripeness stage with highest count
  let maxCount = 0;
  let dominantRipeness: 'Not Mature' | 'Mature' | 'Ripe' | 'Over Ripe' = 'Mature';

  for (const [stage, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      dominantRipeness = ripenessMap[stage] || 'Mature';
    }
  }

  return dominantRipeness;
};

export const getRipenessColor = (ripeness: string): string => {
  switch (ripeness) {
    case 'Not Mature':
      return 'hsl(120, 70%, 45%)'; // Green
    case 'Mature':
      return 'hsl(60, 90%, 50%)'; // Yellow
    case 'Ripe':
      return 'hsl(30, 90%, 55%)'; // Orange
    case 'Over Ripe':
      return 'hsl(15, 70%, 50%)'; // Brown/Red
    default:
      return 'hsl(158, 70%, 45%)';
  }
};

export const getRipenessBadgeClass = (ripeness: string): string => {
  switch (ripeness) {
    case 'Not Mature':
      return 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30';
    case 'Mature':
      return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30';
    case 'Ripe':
      return 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30';
    case 'Over Ripe':
      return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30';
    default:
      return 'bg-primary-glass text-primary border-primary/30';
  }
};