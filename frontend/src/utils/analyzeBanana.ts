import { ScanResult, RipenessDetection } from "@/types";

const ripenessStages = ['Not Mature', 'Mature', 'Ripe', 'Over Ripe'] as const;

export const analyzeBanana = (image: string, userId: string): ScanResult => {
  // Mock AI analysis - simulates YOLOv8 processing for Saba bananas
  // Typical Saba bunch size in Philippines
  const bananaCount = Math.floor(Math.random() * 7) + 2; // 2-8 bananas
  
  // Generate individual banana detections with realistic ripeness distribution
  // In Philippines climate, mixed ripeness in one bunch is very common
  const ripenessResults: RipenessDetection[] = [];
  const ripenessDistribution: Record<string, number> = {
    'Not Mature': 0,
    'Mature': 0,
    'Ripe': 0,
    'Over Ripe': 0
  };

  // Weighted probabilities based on Philippine Saba banana ripening patterns
  const ripenessWeights = {
    'Not Mature': 0.25,  // 25% - Green, not ready
    'Mature': 0.35,      // 35% - Yellow-green, ready to harvest
    'Ripe': 0.30,        // 30% - Yellow, ready to eat
    'Over Ripe': 0.10    // 10% - Brown spots, very soft
  };

  for (let i = 0; i < bananaCount; i++) {
    // Randomly select ripeness based on weighted distribution
    const random = Math.random();
    let cumulative = 0;
    let selectedRipeness = 'Mature';

    for (const [ripeness, weight] of Object.entries(ripenessWeights)) {
      cumulative += weight;
      if (random <= cumulative) {
        selectedRipeness = ripeness;
        break;
      }
    }

    // Generate confidence based on ripeness stage
    const confidenceRanges = {
      'Not Mature': [85, 98],
      'Mature': [80, 95],
      'Ripe': [88, 99],
      'Over Ripe': [75, 92]
    };

    const [minConf, maxConf] = confidenceRanges[selectedRipeness as keyof typeof confidenceRanges];
    const confidence = Math.floor(Math.random() * (maxConf - minConf + 1)) + minConf;

    // Generate realistic bounding box coordinates
    const bbox = [
      Math.floor(Math.random() * 400) + 50,  // x1
      Math.floor(Math.random() * 300) + 50,  // y1
      Math.floor(Math.random() * 200) + 100, // width -> x2
      Math.floor(Math.random() * 150) + 120  // height -> y2
    ];

    ripenessResults.push({
      ripeness: selectedRipeness as 'Not Mature' | 'Mature' | 'Ripe' | 'Over Ripe',
      confidence,
      bbox
    });

    // Update distribution count
    ripenessDistribution[selectedRipeness]++;
  }

  // Calculate overall statistics
  const totalConfidence = ripenessResults.reduce((sum, result) => sum + result.confidence, 0);
  const avgConfidence = Math.round(totalConfidence / ripenessResults.length);

  // Determine dominant ripeness (most common)
  const dominantRipeness = Object.entries(ripenessDistribution)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Mature';

  // Calculate breakdown with percentages
  const ripenessBreakdown: Record<string, { count: number; percentage: number }> = {};
  Object.entries(ripenessDistribution).forEach(([ripeness, count]) => {
    if (count > 0) {
      ripenessBreakdown[ripeness] = {
        count,
        percentage: Math.round((count / bananaCount) * 100 * 10) / 10
      };
    }
  });

  // Remove zero counts from distribution for cleaner display
  const cleanDistribution = Object.fromEntries(
    Object.entries(ripenessDistribution).filter(([, count]) => count > 0)
  );

  return {
    id: crypto.randomUUID(),
    userId,
    timestamp: new Date(),
    image,
    ripeness: dominantRipeness as 'Not Mature' | 'Mature' | 'Ripe' | 'Over Ripe',
    bananaCount,
    confidence: avgConfidence,
    ripenessResults,
    ripenessDistribution: cleanDistribution,
    ripenessBreakdown,
    overallRipeness: dominantRipeness,
    notMatureCount: ripenessDistribution['Not Mature'],
    matureCount: ripenessDistribution['Mature'],
    ripeCount: ripenessDistribution['Ripe'],
    overRipeCount: ripenessDistribution['Over Ripe']
  };
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

// Helper function to get ripeness statistics for analytics
export const getRipenessStatistics = (scans: ScanResult[]) => {
  const totalBananas = scans.reduce((sum, scan) => sum + scan.bananaCount, 0);
  const overallDistribution: Record<string, number> = {};
  
  scans.forEach(scan => {
    if (scan.ripenessDistribution) {
      Object.entries(scan.ripenessDistribution).forEach(([ripeness, count]) => {
        overallDistribution[ripeness] = (overallDistribution[ripeness] || 0) + count;
      });
    }
  });

  return {
    totalBananas,
    distribution: overallDistribution,
    percentages: Object.fromEntries(
      Object.entries(overallDistribution).map(([ripeness, count]) => [
        ripeness,
        Math.round((count / totalBananas) * 100 * 10) / 10
      ])
    )
  };
};