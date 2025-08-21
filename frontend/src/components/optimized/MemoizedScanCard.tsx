/**
 * Memoized Scan Card Component for Performance
 * Prevents unnecessary re-renders in scan history lists
 */

import React, { memo } from 'react';
import { Eye, Calendar, Banana } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { ScanResult } from '@/types';
import { getRipenessBadgeClass } from '@/utils/analyzeBanana';
import OptimizedImage from '@/components/OptimizedImage';

interface ScanCardProps {
  scan: ScanResult;
  onView?: (scan: ScanResult) => void;
  showUser?: boolean;
  className?: string;
}

const ScanCard: React.FC<ScanCardProps> = ({ 
  scan, 
  onView, 
  showUser = false,
  className = '' 
}) => {
  console.log('🔄 ScanCard render:', scan.id); // Remove in production

  return (
    <GlassCard className={`hover:shadow-lg transition-shadow duration-200 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {scan.timestamp.toLocaleDateString()} at {scan.timestamp.toLocaleTimeString()}
            </span>
          </div>
          <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getRipenessBadgeClass(scan.ripeness)}`}>
            {scan.ripeness}
          </span>
        </div>

        {/* Image and Details */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <OptimizedImage
              src={scan.image}
              alt="Scanned banana"
              className="w-16 h-16 rounded-lg object-cover"
              lazy={true}
            />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Banana className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">
                {scan.bananaCount} banana{scan.bananaCount !== 1 ? 's' : ''} detected
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Confidence: {scan.confidence}%
              </span>
              
              {/* Quality indicator */}
              {scan.qualityScore && (
                <span className="text-xs text-muted-foreground">
                  Quality: {Math.round(scan.qualityScore * 100)}%
                </span>
              )}
            </div>

            {/* Processing metadata */}
            {scan.processingMetadata && (
              <div className="text-xs text-muted-foreground">
                {scan.processingMetadata.processing_time}s • {scan.processingMetadata.model_version}
              </div>
            )}

            {/* Error indicator */}
            {scan.errorMessage && (
              <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                Analysis had issues
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {onView && (
            <GlassButton
              onClick={() => onView(scan)}
              variant="glass"
              size="sm"
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </GlassButton>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

// Memoized version with custom comparison
export const MemoizedScanCard = memo(ScanCard, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.scan.id === nextProps.scan.id &&
    prevProps.scan.timestamp.getTime() === nextProps.scan.timestamp.getTime() &&
    prevProps.scan.confidence === nextProps.scan.confidence &&
    prevProps.showUser === nextProps.showUser &&
    prevProps.className === nextProps.className
  );
});

MemoizedScanCard.displayName = 'MemoizedScanCard';

export default MemoizedScanCard;