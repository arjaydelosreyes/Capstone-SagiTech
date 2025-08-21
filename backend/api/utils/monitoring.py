"""
Monitoring and Performance Tracking for SagiTech
"""

import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from django.core.cache import cache
from django.db.models import Avg, Count, Q
from django.utils import timezone
from ..models import ScanRecord, ActivityLog, User

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """Monitor system performance and generate metrics"""
    
    @staticmethod
    def track_prediction_performance(scan_record: ScanRecord):
        """Track performance metrics for predictions"""
        try:
            # Cache key for daily metrics
            today = datetime.now().strftime('%Y-%m-%d')
            cache_key = f"prediction_metrics:{today}"
            
            # Get existing metrics
            metrics = cache.get(cache_key, {
                'total_predictions': 0,
                'total_processing_time': 0.0,
                'total_bananas_detected': 0,
                'avg_confidence': 0.0,
                'error_count': 0
            })
            
            # Update metrics
            metrics['total_predictions'] += 1
            metrics['total_processing_time'] += scan_record.processing_time
            metrics['total_bananas_detected'] += scan_record.banana_count
            
            # Calculate running average confidence
            current_avg = metrics['avg_confidence']
            new_confidence = scan_record.avg_confidence
            total_predictions = metrics['total_predictions']
            metrics['avg_confidence'] = ((current_avg * (total_predictions - 1)) + new_confidence) / total_predictions
            
            if scan_record.error_message:
                metrics['error_count'] += 1
            
            # Cache for 24 hours
            cache.set(cache_key, metrics, 86400)
            
            logger.info(f"📊 Performance metrics updated: {metrics}")
            
        except Exception as e:
            logger.error(f"Failed to track performance: {e}")

    @staticmethod
    def get_system_health() -> Dict[str, Any]:
        """Get comprehensive system health metrics"""
        try:
            now = timezone.now()
            last_24h = now - timedelta(hours=24)
            last_week = now - timedelta(days=7)
            
            # Database performance
            db_start = time.time()
            total_scans = ScanRecord.objects.count()
            db_time = time.time() - db_start
            
            # Recent activity
            recent_scans = ScanRecord.objects.filter(timestamp__gte=last_24h).count()
            recent_errors = ScanRecord.objects.filter(
                timestamp__gte=last_24h,
                error_message__isnull=False
            ).count()
            
            # Performance metrics
            avg_processing_time = ScanRecord.objects.filter(
                timestamp__gte=last_week
            ).aggregate(avg_time=Avg('processing_time'))['avg_time'] or 0.0
            
            avg_confidence = ScanRecord.objects.filter(
                timestamp__gte=last_week
            ).aggregate(avg_conf=Avg('avg_confidence'))['avg_conf'] or 0.0
            
            # Error rate
            error_rate = (recent_errors / recent_scans * 100) if recent_scans > 0 else 0.0
            
            # User activity
            active_users = User.objects.filter(last_login__gte=last_week).count()
            total_users = User.objects.count()
            
            health_metrics = {
                'system_status': 'healthy' if error_rate < 5 else 'degraded' if error_rate < 20 else 'critical',
                'database_response_time': round(db_time * 1000, 2),  # ms
                'total_scans': total_scans,
                'recent_scans_24h': recent_scans,
                'error_rate_24h': round(error_rate, 2),
                'avg_processing_time': round(avg_processing_time, 3),
                'avg_confidence': round(avg_confidence, 2),
                'active_users_week': active_users,
                'total_users': total_users,
                'user_activity_rate': round((active_users / total_users * 100) if total_users > 0 else 0, 2),
                'timestamp': now.isoformat()
            }
            
            logger.info(f"📊 System health: {health_metrics['system_status']}")
            return health_metrics
            
        except Exception as e:
            logger.error(f"Failed to get system health: {e}")
            return {
                'system_status': 'unknown',
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }

    @staticmethod
    def get_model_performance() -> Dict[str, Any]:
        """Get ML model performance metrics"""
        try:
            last_week = timezone.now() - timedelta(days=7)
            
            # Get recent successful predictions
            successful_scans = ScanRecord.objects.filter(
                timestamp__gte=last_week,
                error_message__isnull=True
            )
            
            if not successful_scans.exists():
                return {
                    'status': 'no_data',
                    'message': 'No recent successful predictions'
                }
            
            # Calculate metrics
            total_predictions = successful_scans.count()
            avg_confidence = successful_scans.aggregate(avg=Avg('avg_confidence'))['avg'] or 0.0
            avg_processing_time = successful_scans.aggregate(avg=Avg('processing_time'))['avg'] or 0.0
            
            # Confidence distribution
            high_confidence = successful_scans.filter(avg_confidence__gte=0.8).count()
            medium_confidence = successful_scans.filter(
                avg_confidence__gte=0.6, 
                avg_confidence__lt=0.8
            ).count()
            low_confidence = successful_scans.filter(avg_confidence__lt=0.6).count()
            
            # Ripeness detection accuracy (simplified)
            ripeness_stats = {}
            for scan in successful_scans:
                for result in scan.ripeness_results:
                    ripeness = result.get('ripeness', 'unknown')
                    if ripeness not in ripeness_stats:
                        ripeness_stats[ripeness] = {'count': 0, 'total_confidence': 0.0}
                    ripeness_stats[ripeness]['count'] += 1
                    ripeness_stats[ripeness]['total_confidence'] += result.get('confidence', 0.0)
            
            # Calculate average confidence per ripeness class
            for ripeness, stats in ripeness_stats.items():
                stats['avg_confidence'] = stats['total_confidence'] / stats['count']
            
            return {
                'status': 'healthy',
                'total_predictions': total_predictions,
                'avg_confidence': round(avg_confidence, 3),
                'avg_processing_time': round(avg_processing_time, 3),
                'confidence_distribution': {
                    'high': high_confidence,
                    'medium': medium_confidence,
                    'low': low_confidence
                },
                'ripeness_performance': ripeness_stats,
                'model_accuracy_estimate': round(avg_confidence, 2),  # Simplified
                'timestamp': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get model performance: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }


class RequestTimingMiddleware(MiddlewareMixin):
    """Track request timing for performance monitoring"""
    
    def process_request(self, request):
        request._start_time = time.time()
        return None
    
    def process_response(self, request, response):
        if hasattr(request, '_start_time'):
            duration = time.time() - request._start_time
            
            # Add timing header
            response['X-Response-Time'] = f"{duration:.3f}s"
            
            # Log slow requests
            if duration > 3.0:  # 3 seconds
                logger.warning(f"Slow request: {request.method} {request.path} took {duration:.3f}s")
                
                # Log to activity log for tracking
                if request.user.is_authenticated:
                    try:
                        ActivityLog.objects.create(
                            user=request.user,
                            action='slow_request',
                            description=f'Slow request detected: {request.path}',
                            metadata={
                                'duration': duration,
                                'method': request.method,
                                'path': request.path
                            }
                        )
                    except Exception as e:
                        logger.error(f"Failed to log slow request: {e}")
        
        return response


class ErrorTrackingMiddleware(MiddlewareMixin):
    """Track and log errors for monitoring"""
    
    def process_exception(self, request, exception):
        logger.error(f"Exception in {request.path}: {str(exception)}")
        
        # Track error in cache for monitoring
        error_key = f"errors:{datetime.now().strftime('%Y-%m-%d')}"
        error_count = cache.get(error_key, 0)
        cache.set(error_key, error_count + 1, 86400)  # 24 hours
        
        # Log to activity log
        if request.user.is_authenticated:
            try:
                ActivityLog.objects.create(
                    user=request.user,
                    action='system_error',
                    description=f'System error in {request.path}',
                    metadata={
                        'error_type': type(exception).__name__,
                        'error_message': str(exception),
                        'path': request.path,
                        'method': request.method
                    }
                )
            except Exception as log_error:
                logger.error(f"Failed to log error to activity log: {log_error}")
        
        return None