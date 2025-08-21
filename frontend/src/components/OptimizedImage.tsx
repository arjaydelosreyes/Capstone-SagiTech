/**
 * Optimized Image Component with lazy loading and error handling
 * Improves performance for image-heavy pages like scan history
 */

import React, { useState, useRef, useEffect } from 'react';
import { ImageIcon, AlertTriangle } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Event) => void;
  lazy?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  fallback,
  onLoad,
  onError,
  lazy = true
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('🖼️ Image load error:', src, event);
    setHasError(true);
    setIsLoaded(false);
    onError?.(event.nativeEvent);
  };

  // Show placeholder while not in view (for lazy loading)
  if (lazy && !isInView) {
    return (
      <div 
        ref={imgRef}
        className={`bg-muted/50 flex items-center justify-center ${className}`}
      >
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  // Show error state
  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 flex flex-col items-center justify-center p-4 ${className}`}>
        <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
        <span className="text-sm text-red-600 dark:text-red-400 text-center">
          Failed to load image
        </span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Loading placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted/50 flex items-center justify-center">
          <div className="animate-pulse">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      )}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
      />
    </div>
  );
};

export default OptimizedImage;