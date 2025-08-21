"""
Custom middleware for SagiTech security and monitoring
"""

import time
import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.conf import settings
from django.core.cache import cache
from .models import ActivityLog

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(MiddlewareMixin):
    """Add security headers to all responses"""
    
    def process_response(self, request, response):
        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # CORS headers for API endpoints
        if request.path.startswith('/api/'):
            response['Access-Control-Allow-Origin'] = 'http://localhost:8080'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        
        return response


class RateLimitMiddleware(MiddlewareMixin):
    """Rate limiting for API endpoints"""
    
    def process_request(self, request):
        if not request.path.startswith('/api/'):
            return None
            
        # Get client IP
        ip = self._get_client_ip(request)
        
        # Different limits for different endpoints
        if request.path.startswith('/api/predict/'):
            # Stricter limit for prediction endpoint (resource intensive)
            limit = 10  # requests per minute
            window = 60  # seconds
        else:
            # General API limit
            limit = 100  # requests per minute
            window = 60  # seconds
        
        cache_key = f"rate_limit:{ip}:{request.path}"
        
        # Get current count
        current_count = cache.get(cache_key, 0)
        
        if current_count >= limit:
            logger.warning(f"Rate limit exceeded for IP {ip} on {request.path}")
            return JsonResponse({
                'error': 'Rate limit exceeded',
                'details': f'Maximum {limit} requests per minute allowed'
            }, status=429)
        
        # Increment counter
        cache.set(cache_key, current_count + 1, window)
        
        return None
    
    def _get_client_ip(self, request):
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class RequestLoggingMiddleware(MiddlewareMixin):
    """Log API requests for monitoring and debugging"""
    
    def process_request(self, request):
        if request.path.startswith('/api/'):
            request._start_time = time.time()
            
            logger.info(f"API Request: {request.method} {request.path}")
            logger.info(f"User: {request.user if request.user.is_authenticated else 'Anonymous'}")
            logger.info(f"IP: {self._get_client_ip(request)}")
            logger.info(f"User-Agent: {request.META.get('HTTP_USER_AGENT', 'Unknown')}")
        
        return None
    
    def process_response(self, request, response):
        if hasattr(request, '_start_time') and request.path.startswith('/api/'):
            duration = time.time() - request._start_time
            
            logger.info(f"API Response: {response.status_code} in {duration:.3f}s")
            
            # Log slow requests
            if duration > 5.0:  # 5 seconds
                logger.warning(f"Slow API request: {request.method} {request.path} took {duration:.3f}s")
            
            # Log to activity log for important endpoints
            if request.path.startswith('/api/predict/') and response.status_code == 200:
                try:
                    if request.user.is_authenticated:
                        ActivityLog.objects.create(
                            user=request.user,
                            action='api_prediction_request',
                            description=f'Prediction API called successfully',
                            ip_address=self._get_client_ip(request),
                            metadata={
                                'response_time': duration,
                                'status_code': response.status_code,
                                'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown')
                            }
                        )
                except Exception as e:
                    logger.error(f"Failed to log activity: {e}")
        
        return response
    
    def _get_client_ip(self, request):
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ErrorHandlingMiddleware(MiddlewareMixin):
    """Global error handling middleware"""
    
    def process_exception(self, request, exception):
        logger.error(f"Unhandled exception in {request.path}: {str(exception)}")
        logger.error(f"Exception type: {type(exception).__name__}")
        logger.error(f"User: {request.user if request.user.is_authenticated else 'Anonymous'}")
        
        # Return JSON error for API endpoints
        if request.path.startswith('/api/'):
            return JsonResponse({
                'error': 'Internal server error',
                'details': 'An unexpected error occurred',
                'technical_details': str(exception) if settings.DEBUG else None
            }, status=500)
        
        return None