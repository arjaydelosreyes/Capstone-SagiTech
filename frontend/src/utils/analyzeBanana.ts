import { ScanResult } from "@/types";

const ripenessStages = ['Not Mature', 'Mature', 'Ripe', 'Over Ripe'] as const;

export const analyzeBanana = (image: string, userId: string): ScanResult => {
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