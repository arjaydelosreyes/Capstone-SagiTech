/**
 * Virtualized Scan List Component for Performance
 * Handles large lists efficiently using react-window
 */

import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ScanResult } from '@/types';
import MemoizedScanCard from './MemoizedScanCard';
import { PERFORMANCE } from '@/config/constants';

interface VirtualizedScanListProps {
  scans: ScanResult[];
  onViewScan?: (scan: ScanResult) => void;
  height?: number;
  itemHeight?: number;
  className?: string;
}

interface ListItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    scans: ScanResult[];
    onViewScan?: (scan: ScanResult) => void;
  };
}

const ListItem: React.FC<ListItemProps> = memo(({ index, style, data }) => {
  const { scans, onViewScan } = data;
  const scan = scans[index];

  if (!scan) return null;

  return (
    <div style={style} className="px-2 pb-4">
      <MemoizedScanCard
        scan={scan}
        onView={onViewScan}
      />
    </div>
  );
});

ListItem.displayName = 'VirtualizedListItem';

const VirtualizedScanList: React.FC<VirtualizedScanListProps> = ({
  scans,
  onViewScan,
  height = 600,
  itemHeight = 180,
  className = ''
}) => {
  // Memoize the data object to prevent unnecessary re-renders
  const listData = useMemo(() => ({
    scans,
    onViewScan
  }), [scans, onViewScan]);

  // Use virtualization only for large lists
  if (scans.length < PERFORMANCE.VIRTUAL_SCROLLING_THRESHOLD) {
    return (
      <div className={`space-y-4 ${className}`}>
        {scans.map((scan) => (
          <MemoizedScanCard
            key={scan.id}
            scan={scan}
            onView={onViewScan}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <List
        height={height}
        itemCount={scans.length}
        itemSize={itemHeight}
        itemData={listData}
        className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
      >
        {ListItem}
      </List>
    </div>
  );
};

export default memo(VirtualizedScanList);