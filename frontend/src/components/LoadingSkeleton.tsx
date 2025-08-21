/**
 * Loading Skeleton Components for better UX
 * Provides visual feedback while content is loading
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width = 'w-full', 
  height = 'h-4',
  rounded = true 
}) => (
  <div 
    className={`animate-pulse bg-muted/50 ${width} ${height} ${rounded ? 'rounded' : ''} ${className}`} 
  />
);

export const CardSkeleton: React.FC = () => (
  <div className="p-6 space-y-4">
    <Skeleton height="h-6" width="w-3/4" />
    <Skeleton height="h-4" width="w-full" />
    <Skeleton height="h-4" width="w-2/3" />
  </div>
);

export const ScanHistorySkeleton: React.FC = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="p-4 border border-glass-border rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton width="w-24" height="h-6" />
          <Skeleton width="w-16" height="h-5" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton width="w-16" height="w-16" />
          <div className="flex-1 space-y-2">
            <Skeleton width="w-1/2" height="h-4" />
            <Skeleton width="w-1/3" height="h-3" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-8">
    {/* Header skeleton */}
    <div className="space-y-2">
      <Skeleton width="w-1/2" height="h-8" />
      <Skeleton width="w-1/3" height="h-5" />
    </div>
    
    {/* Stats cards skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="p-6 border border-glass-border rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton width="w-12" height="h-12" />
            <Skeleton width="w-4" height="h-4" />
          </div>
          <div className="space-y-2">
            <Skeleton width="w-16" height="h-8" />
            <Skeleton width="w-24" height="h-4" />
          </div>
        </div>
      ))}
    </div>
    
    {/* Content skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  </div>
);

export const AnalyticsSkeleton: React.FC = () => (
  <div className="space-y-8">
    {/* Charts skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="p-6 border border-glass-border rounded-lg space-y-4">
        <Skeleton width="w-1/3" height="h-6" />
        <Skeleton width="w-full" height="h-64" />
      </div>
      <div className="p-6 border border-glass-border rounded-lg space-y-4">
        <Skeleton width="w-1/3" height="h-6" />
        <Skeleton width="w-full" height="h-64" />
      </div>
    </div>
    
    {/* Summary skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="p-6 border border-glass-border rounded-lg text-center space-y-2">
          <Skeleton width="w-16" height="h-8" className="mx-auto" />
          <Skeleton width="w-24" height="h-4" className="mx-auto" />
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;