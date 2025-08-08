import { authService } from './authService';

export interface BananaDetection {
  class_id: number;
  class_name: string;
  confidence: number;
  polygon: [number, number][];
  bbox: [number, number, number, number];
  area: number;
  quality_score: number;
  timestamp: string;
}

export interface QualityMetrics {
  total_detections: number;
  avg_confidence: number;
  avg_quality_score: number;
  detection_density: number;
}

export interface AdvancedAnalysisResult {
  success: boolean;
  processing_time: number;
  model_version: string;
  detections: BananaDetection[];
  banana_count: number;
  quality_metrics: QualityMetrics;
  overall_quality_score: number;
  ripeness_distribution: Record<string, number>;
  visualization_image?: string;
  error_message?: string;
  scan_record_id?: number;
  metadata: Record<string, any>;
}

export interface AnalysisConfig {
  confidence_threshold?: number;
  iou_threshold?: number;
  return_visualization?: boolean;
  save_results?: boolean;
}

export class AdvancedBananaAnalyzer {
  private static API_BASE = '/api/ml';

  /**
   * Analyze a single image using the advanced ML system
   */
  static async analyzeImage(
    imageFile: File, 
    config: AnalysisConfig = {}
  ): Promise<AdvancedAnalysisResult> {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      // Add configuration parameters
      if (config.confidence_threshold !== undefined) {
        formData.append('confidence_threshold', config.confidence_threshold.toString());
      }
      if (config.iou_threshold !== undefined) {
        formData.append('iou_threshold', config.iou_threshold.toString());
      }
      if (config.return_visualization !== undefined) {
        formData.append('return_visualization', config.return_visualization.toString());
      }
      if (config.save_results !== undefined) {
        formData.append('save_results', config.save_results.toString());
      }

      const response = await authService.request(`${this.API_BASE}/analyze/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_message || `Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      return this.validateAndNormalizeResult(result);

    } catch (error) {
      console.error('Advanced analysis failed:', error);
      return {
        success: false,
        processing_time: 0,
        model_version: 'unknown',
        detections: [],
        banana_count: 0,
        quality_metrics: {
          total_detections: 0,
          avg_confidence: 0,
          avg_quality_score: 0,
          detection_density: 0
        },
        overall_quality_score: 0,
        ripeness_distribution: {},
        error_message: error instanceof Error ? error.message : 'Unknown error',
        metadata: {}
      };
    }
  }

  /**
   * Analyze multiple images in bulk
   */
  static async analyzeBulk(
    imageFiles: File[], 
    config: AnalysisConfig = {}
  ): Promise<{
    success: boolean;
    total_images: number;
    successful_analyses: number;
    total_bananas_detected: number;
    avg_processing_time: number;
    results: Array<{
      index: number;
      success: boolean;
      banana_count?: number;
      processing_time?: number;
      quality_score?: number;
      scan_record_id?: number;
      error_message?: string;
    }>;
  }> {
    try {
      const formData = new FormData();
      
      // Add all image files
      imageFiles.forEach((file, index) => {
        formData.append('images', file);
      });
      
      // Add configuration
      if (config.confidence_threshold !== undefined) {
        formData.append('confidence_threshold', config.confidence_threshold.toString());
      }
      if (config.save_results !== undefined) {
        formData.append('save_results', config.save_results.toString());
      }

      const response = await authService.request(`${this.API_BASE}/bulk-analyze/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_message || `Bulk analysis failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Bulk analysis failed:', error);
      return {
        success: false,
        total_images: imageFiles.length,
        successful_analyses: 0,
        total_bananas_detected: 0,
        avg_processing_time: 0,
        results: imageFiles.map((_, index) => ({
          index,
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        }))
      };
    }
  }

  /**
   * Get model performance statistics
   */
  static async getPerformanceStats(
    period: 'hour' | 'day' | 'week' | 'month' = 'day',
    modelVersion: string = 'latest'
  ): Promise<{
    success: boolean;
    time_period: string;
    model_version: string;
    metrics: {
      avg_inference_time: number;
      avg_confidence: number;
      avg_quality_score: number;
      total_inferences: number;
      total_scans: number;
      total_bananas: number;
      avg_processing_time: number;
      error_rate: number;
    };
    trends: Array<{
      timestamp: string;
      inference_time: number;
      quality_score: number;
      confidence: number;
      inferences: number;
    }>;
    class_distribution: Record<string, number>;
  }> {
    try {
      const params = new URLSearchParams({
        period,
        version: modelVersion
      });

      const response = await authService.request(`${this.API_BASE}/performance/?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_message || `Performance query failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Performance stats failed:', error);
      throw error;
    }
  }

  /**
   * Analyze image from base64 data URL
   */
  static async analyzeImageFromDataURL(
    dataURL: string, 
    filename: string = 'capture.jpg',
    config: AnalysisConfig = {}
  ): Promise<AdvancedAnalysisResult> {
    try {
      // Convert data URL to File
      const file = this.dataURLToFile(dataURL, filename);
      return await this.analyzeImage(file, config);
    } catch (error) {
      console.error('Analysis from data URL failed:', error);
      throw error;
    }
  }

  /**
   * Convert data URL to File object
   */
  private static dataURLToFile(dataURL: string, filename: string): File {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  }

  /**
   * Validate and normalize the analysis result
   */
  private static validateAndNormalizeResult(result: any): AdvancedAnalysisResult {
    return {
      success: result.success || false,
      processing_time: result.processing_time || 0,
      model_version: result.model_version || 'unknown',
      detections: result.detections || [],
      banana_count: result.banana_count || 0,
      quality_metrics: {
        total_detections: result.quality_metrics?.total_detections || 0,
        avg_confidence: result.quality_metrics?.avg_confidence || 0,
        avg_quality_score: result.quality_metrics?.avg_quality_score || 0,
        detection_density: result.quality_metrics?.detection_density || 0
      },
      overall_quality_score: result.overall_quality_score || 0,
      ripeness_distribution: result.ripeness_distribution || {},
      visualization_image: result.visualization_image,
      error_message: result.error_message,
      scan_record_id: result.scan_record_id,
      metadata: result.metadata || {}
    };
  }

  /**
   * Get ripeness color for visualization
   */
  static getRipenessColor(ripeness: string): string {
    switch (ripeness) {
      case 'Not Mature':
        return '#16a34a'; // Green
      case 'Mature':
        return '#eab308'; // Yellow
      case 'Ripe':
        return '#f97316'; // Orange
      case 'Over Ripe':
        return '#dc2626'; // Red
      default:
        return '#6b7280'; // Gray
    }
  }

  /**
   * Get ripeness badge CSS classes
   */
  static getRipenessBadgeClass(ripeness: string): string {
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
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30';
    }
  }

  /**
   * Create a visualization overlay on canvas
   */
  static drawDetectionOverlay(
    canvas: HTMLCanvasElement,
    detections: BananaDetection[],
    imageWidth: number,
    imageHeight: number
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = imageWidth;
    canvas.height = imageHeight;

    // Draw each detection
    detections.forEach((detection, index) => {
      const color = this.getRipenessColor(detection.class_name);
      
      // Draw polygon
      if (detection.polygon && detection.polygon.length > 2) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        detection.polygon.forEach((point, i) => {
          if (i === 0) {
            ctx.moveTo(point[0], point[1]);
          } else {
            ctx.lineTo(point[0], point[1]);
          }
        });
        ctx.closePath();
        ctx.stroke();

        // Fill with transparency
        ctx.fillStyle = color + '20';
        ctx.fill();
      }

      // Draw bounding box
      const [x1, y1, x2, y2] = detection.bbox;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      // Draw label
      const label = `${detection.class_name} (${(detection.confidence * 100).toFixed(1)}%)`;
      ctx.fillStyle = color;
      ctx.font = '14px Arial';
      ctx.fillText(label, x1, y1 - 5);
    });
  }

  /**
   * Format processing time for display
   */
  static formatProcessingTime(timeInSeconds: number): string {
    if (timeInSeconds < 1) {
      return `${(timeInSeconds * 1000).toFixed(0)}ms`;
    }
    return `${timeInSeconds.toFixed(2)}s`;
  }

  /**
   * Calculate quality grade
   */
  static getQualityGrade(score: number): {
    grade: string;
    color: string;
    description: string;
  } {
    if (score >= 0.9) {
      return { grade: 'A+', color: '#16a34a', description: 'Excellent' };
    } else if (score >= 0.8) {
      return { grade: 'A', color: '#22c55e', description: 'Very Good' };
    } else if (score >= 0.7) {
      return { grade: 'B', color: '#eab308', description: 'Good' };
    } else if (score >= 0.6) {
      return { grade: 'C', color: '#f97316', description: 'Fair' };
    } else {
      return { grade: 'D', color: '#dc2626', description: 'Poor' };
    }
  }
}