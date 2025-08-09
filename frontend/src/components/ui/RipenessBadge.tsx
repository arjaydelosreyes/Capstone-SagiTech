import React from 'react';
import { RipenessBadgeProps } from '@/types';
import { getRipenessBadgeClass } from '@/utils/analyzeBanana';

export const RipenessBadge: React.FC<RipenessBadgeProps> = ({
  ripeness,
  count,
  percentage,
  size = 'md',
  showCount = true,
  showPercentage = false,
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const badgeClass = getRipenessBadgeClass(ripeness);
  const sizeClass = sizeClasses[size];

  const getDisplayText = () => {
    let text = ripeness;
    
    if (showCount && showPercentage && percentage !== undefined) {
      text += ` (${count} - ${percentage}%)`;
    } else if (showCount) {
      text += ` (${count})`;
    } else if (showPercentage && percentage !== undefined) {
      text += ` (${percentage}%)`;
    }
    
    return text;
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg font-medium border ${badgeClass} ${sizeClass}`}
      title={`${ripeness}: ${count} banana${count !== 1 ? 's' : ''}${percentage !== undefined ? ` (${percentage}%)` : ''}`}
    >
      {getDisplayText()}
    </span>
  );
};

export const RipenessBadgeGroup: React.FC<{
  ripenessDistribution: Record<string, number>;
  ripenessBreakdown?: Record<string, { count: number; percentage: number }>;
  totalBananas: number;
  size?: 'sm' | 'md' | 'lg';
  showPercentages?: boolean;
  maxBadges?: number;
}> = ({
  ripenessDistribution,
  ripenessBreakdown,
  totalBananas,
  size = 'md',
  showPercentages = false,
  maxBadges,
}) => {
  // Sort by count (highest first) and optionally limit
  const sortedRipeness = Object.entries(ripenessDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxBadges);

  if (sortedRipeness.length === 0) {
    return (
      <span className="text-sm text-muted-foreground italic">
        No ripeness data available
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sortedRipeness.map(([ripeness, count]) => {
        const breakdown = ripenessBreakdown?.[ripeness];
        const percentage = breakdown?.percentage ?? 
          Math.round((count / totalBananas) * 100 * 10) / 10;

        return (
          <RipenessBadge
            key={ripeness}
            ripeness={ripeness}
            count={count}
            percentage={percentage}
            size={size}
            showCount={true}
            showPercentage={showPercentages}
          />
        );
      })}
      
      {/* Show "+" indicator if there are more badges than maxBadges */}
      {maxBadges && Object.keys(ripenessDistribution).length > maxBadges && (
        <span className="inline-flex items-center px-2 py-1 text-xs text-muted-foreground border border-dashed border-muted-foreground rounded-lg">
          +{Object.keys(ripenessDistribution).length - maxBadges} more
        </span>
      )}
    </div>
  );
};