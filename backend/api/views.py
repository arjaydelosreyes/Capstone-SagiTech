from django.shortcuts import render
from rest_framework import viewsets, status
from .models import Profile, ScanRecord, SystemSetting, ActivityLog, MLModelPerformance, QualityAlert
from .serializers import (
    ProfileSerializer, RegisterSerializer, ScanRecordSerializer, EnhancedScanRecordSerializer,
    SystemSettingSerializer, ActivityLogSerializer, MLModelPerformanceSerializer, 
    QualityAlertSerializer, MLAnalysisRequestSerializer, MLAnalysisResponseSerializer,
    BulkAnalysisRequestSerializer, ModelPerformanceStatsSerializer
)
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework import generics, permissions
from .permissions import IsAdminUserProfile
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from collections import Counter
from django.db.models import Sum, Avg, Count, Q
import calendar
import logging
import traceback
try:
    import cv2
    import numpy as np
    from PIL import Image
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

import io
import base64
import json
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)

# Import ML components
try:
    from ..ml.banana_detection.inference import BananaDetector, get_detector
    ML_AVAILABLE = True and CV2_AVAILABLE
    logger.info("ML components loaded successfully" if ML_AVAILABLE else "ML components available but CV2 missing")
except ImportError as e:
    logger.warning(f"ML components not available: {e}")
    ML_AVAILABLE = False

# Create your views here.

class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        profile = self.get_queryset().get(user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

class ScanRecordViewSet(viewsets.ModelViewSet):
    serializer_class = ScanRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return ScanRecord.objects.filter(user=self.request.user).order_by('-timestamp')

    def get_serializer_class(self):
        """Use enhanced serializer for detailed views"""
        if self.action == 'retrieve' or self.request.query_params.get('detailed', False):
            return EnhancedScanRecordSerializer
        return ScanRecordSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get scan analytics for the current user"""
        user_scans = self.get_queryset()
        
        # Basic statistics
        total_scans = user_scans.count()
        total_bananas = user_scans.aggregate(total=Sum('banana_count'))['total'] or 0
        avg_confidence = user_scans.aggregate(avg=Avg('avg_confidence'))['avg'] or 0.0
        avg_quality = user_scans.aggregate(avg=Avg('overall_quality_score'))['avg'] or 0.0
        
        # Ripeness distribution
        ripeness_counts = {
            'Not Mature': user_scans.aggregate(total=Sum('not_mature_count'))['total'] or 0,
            'Mature': user_scans.aggregate(total=Sum('mature_count'))['total'] or 0,
            'Ripe': user_scans.aggregate(total=Sum('ripe_count'))['total'] or 0,
            'Over Ripe': user_scans.aggregate(total=Sum('over_ripe_count'))['total'] or 0,
        }
        
        # Recent activity (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_scans = user_scans.filter(timestamp__gte=thirty_days_ago)
        
        # Performance trends
        performance_trend = []
        for i in range(7):
            date = timezone.now() - timedelta(days=i)
            day_scans = user_scans.filter(
                timestamp__date=date.date()
            )
            performance_trend.append({
                'date': date.strftime('%Y-%m-%d'),
                'scans': day_scans.count(),
                'bananas': day_scans.aggregate(total=Sum('banana_count'))['total'] or 0,
                'avg_quality': day_scans.aggregate(avg=Avg('overall_quality_score'))['avg'] or 0.0
            })
        
        return Response({
            'total_scans': total_scans,
            'total_bananas': total_bananas,
            'avg_confidence': round(avg_confidence, 2),
            'avg_quality_score': round(avg_quality, 2),
            'ripeness_distribution': ripeness_counts,
            'recent_scans_count': recent_scans.count(),
            'performance_trend': performance_trend[::-1]  # Reverse to show oldest first
        })

class MLAnalysisView(APIView):
    """
    Advanced ML Analysis endpoint with production-grade capabilities
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        """Perform ML analysis on uploaded image"""
        if not ML_AVAILABLE:
            return Response({
                'success': False,
                'error_message': 'ML functionality not available'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        try:
            # Validate request
            serializer = MLAnalysisRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Get parameters
            image_file = serializer.validated_data['image']
            confidence_threshold = serializer.validated_data.get('confidence_threshold', 0.75)
            iou_threshold = serializer.validated_data.get('iou_threshold', 0.5)
            return_visualization = serializer.validated_data.get('return_visualization', False)
            save_results = serializer.validated_data.get('save_results', True)
            
            # Process image
            image_array = self._process_uploaded_image(image_file)
            
            # Configure detector
            config = {
                'confidence_threshold': confidence_threshold,
                'iou_threshold': iou_threshold,
                'quality_thresholds': {
                    'min_confidence': confidence_threshold,
                    'min_polygon_area': 100,
                    'max_aspect_ratio': 5.0
                }
            }
            
            # Get detector instance
            detector = get_detector()
            detector.config.update(config)
            
            # Run analysis
            analysis_result = detector.classify_bananas(image_array)
            
            # Create visualization if requested
            visualization_image = None
            if return_visualization and analysis_result.success:
                visualization_image = self._create_visualization(image_array, analysis_result.detections)
            
            # Save results if requested
            scan_record = None
            if save_results and analysis_result.success:
                scan_record = self._save_analysis_results(
                    request.user, image_file, analysis_result
                )
            
            # Format response
            response_data = {
                'success': analysis_result.success,
                'processing_time': analysis_result.processing_time,
                'model_version': analysis_result.model_version,
                'detections': [det.to_dict() for det in analysis_result.detections],
                'banana_count': len(analysis_result.detections),
                'quality_metrics': analysis_result.quality_metrics,
                'overall_quality_score': analysis_result.quality_metrics.get('avg_quality_score', 0.0),
                'ripeness_distribution': analysis_result.metadata.get('ripeness_distribution', {}),
                'metadata': analysis_result.metadata
            }
            
            if visualization_image:
                response_data['visualization_image'] = visualization_image
            
            if analysis_result.error_message:
                response_data['error_message'] = analysis_result.error_message
            
            if scan_record:
                response_data['scan_record_id'] = scan_record.id
            
            # Log performance metrics
            self._log_performance_metrics(analysis_result)
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"ML Analysis failed: {e}")
            logger.error(traceback.format_exc())
            
            return Response({
                'success': False,
                'error_message': str(e),
                'processing_time': 0.0,
                'detections': [],
                'banana_count': 0
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _process_uploaded_image(self, image_file):
        """Convert uploaded image to numpy array"""
        if not CV2_AVAILABLE:
            raise ImportError("OpenCV and numpy are required for image processing")
        
        # Read image data
        image_data = image_file.read()
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Convert to numpy array
        image_array = np.array(pil_image)
        
        return image_array
    
    def _create_visualization(self, image, detections):
        """Create visualization with detection overlays"""
        if not CV2_AVAILABLE:
            return None
        
        try:
            # Create a copy of the image
            vis_image = image.copy()
            
            # Draw detections
            for detection in detections:
                # Draw polygon
                polygon_points = np.array(detection.polygon, dtype=np.int32)
                cv2.polylines(vis_image, [polygon_points], True, (0, 255, 0), 2)
                
                # Draw bounding box
                bbox = detection.bbox
                pt1 = (int(bbox[0]), int(bbox[1]))
                pt2 = (int(bbox[2]), int(bbox[3]))
                cv2.rectangle(vis_image, pt1, pt2, (255, 0, 0), 2)
                
                # Add label
                label = f"{detection.class_name} ({detection.confidence:.2f})"
                cv2.putText(vis_image, label, (pt1[0], pt1[1] - 10), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            # Convert to base64
            pil_vis = Image.fromarray(vis_image)
            buffer = io.BytesIO()
            pil_vis.save(buffer, format='JPEG', quality=85)
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            return f"data:image/jpeg;base64,{image_base64}"
            
        except Exception as e:
            logger.error(f"Visualization creation failed: {e}")
            return None
    
    def _save_analysis_results(self, user, image_file, analysis_result):
        """Save analysis results to database"""
        try:
            # Prepare detections data
            detections_data = [det.to_dict() for det in analysis_result.detections]
            
            # Calculate ripeness counts
            ripeness_counts = {'Not Mature': 0, 'Mature': 0, 'Ripe': 0, 'Over Ripe': 0}
            for detection in analysis_result.detections:
                ripeness = detection.class_name
                if ripeness in ripeness_counts:
                    ripeness_counts[ripeness] += 1
            
            # Create legacy format for backward compatibility
            legacy_results = []
            for detection in analysis_result.detections:
                legacy_results.append({
                    'ripeness': detection.class_name,
                    'confidence': detection.confidence,
                    'bbox': list(detection.bbox)
                })
            
            # Create scan record
            scan_record = ScanRecord.objects.create(
                user=user,
                image=image_file,
                banana_count=len(analysis_result.detections),
                ripeness_results=legacy_results,
                avg_confidence=analysis_result.quality_metrics.get('avg_confidence', 0.0),
                overall_quality_score=analysis_result.quality_metrics.get('avg_quality_score', 0.0),
                processing_time=analysis_result.processing_time,
                model_version=analysis_result.model_version,
                detections_data=detections_data,
                quality_metrics=analysis_result.quality_metrics,
                metadata=analysis_result.metadata,
                not_mature_count=ripeness_counts['Not Mature'],
                mature_count=ripeness_counts['Mature'],
                ripe_count=ripeness_counts['Ripe'],
                over_ripe_count=ripeness_counts['Over Ripe'],
                quality_validated=True,
                has_errors=not analysis_result.success,
                error_message=analysis_result.error_message
            )
            
            return scan_record
            
        except Exception as e:
            logger.error(f"Failed to save analysis results: {e}")
            return None
    
    def _log_performance_metrics(self, analysis_result):
        """Log performance metrics for monitoring"""
        try:
            if not analysis_result.success:
                return
            
            # Get or create performance record
            model_version = analysis_result.model_version
            
            # Calculate metrics
            detector = get_detector()
            performance_stats = detector.get_performance_stats()
            
            if performance_stats.get('status') == 'no_data':
                return
            
            # Create performance record
            MLModelPerformance.objects.create(
                model_version=model_version,
                avg_inference_time=performance_stats['avg_inference_time'],
                max_inference_time=performance_stats['max_inference_time'],
                min_inference_time=performance_stats['min_inference_time'],
                total_inferences=performance_stats['total_inferences'],
                avg_confidence=analysis_result.quality_metrics.get('avg_confidence', 0.0),
                avg_quality_score=analysis_result.quality_metrics.get('avg_quality_score', 0.0),
                class_distribution=performance_stats['class_distribution'],
                error_rate=0.0  # Calculate based on recent errors
            )
            
        except Exception as e:
            logger.error(f"Failed to log performance metrics: {e}")

class BulkAnalysisView(APIView):
    """Bulk image analysis endpoint"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        """Process multiple images in batch"""
        if not ML_AVAILABLE:
            return Response({
                'success': False,
                'error_message': 'ML functionality not available'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        try:
            serializer = BulkAnalysisRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            images = serializer.validated_data['images']
            confidence_threshold = serializer.validated_data.get('confidence_threshold', 0.75)
            save_results = serializer.validated_data.get('save_results', True)
            
            results = []
            detector = get_detector()
            
            for i, image_file in enumerate(images):
                try:
                    # Process individual image
                    image_array = self._process_uploaded_image(image_file)
                    analysis_result = detector.classify_bananas(image_array)
                    
                    # Save results if requested
                    scan_record = None
                    if save_results and analysis_result.success:
                        scan_record = self._save_analysis_results(
                            request.user, image_file, analysis_result
                        )
                    
                    results.append({
                        'index': i,
                        'success': analysis_result.success,
                        'banana_count': len(analysis_result.detections),
                        'processing_time': analysis_result.processing_time,
                        'quality_score': analysis_result.quality_metrics.get('avg_quality_score', 0.0),
                        'scan_record_id': scan_record.id if scan_record else None,
                        'error_message': analysis_result.error_message
                    })
                    
                except Exception as e:
                    results.append({
                        'index': i,
                        'success': False,
                        'error_message': str(e)
                    })
            
            # Summary statistics
            successful_results = [r for r in results if r['success']]
            total_bananas = sum(r.get('banana_count', 0) for r in successful_results)
            avg_processing_time = (sum(r.get('processing_time', 0) for r in successful_results) / len(successful_results)) if successful_results else 0
            
            return Response({
                'success': True,
                'total_images': len(images),
                'successful_analyses': len(successful_results),
                'total_bananas_detected': total_bananas,
                'avg_processing_time': avg_processing_time,
                'results': results
            })
            
        except Exception as e:
            logger.error(f"Bulk analysis failed: {e}")
            return Response({
                'success': False,
                'error_message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _process_uploaded_image(self, image_file):
        """Convert uploaded image to numpy array"""
        if not CV2_AVAILABLE:
            raise ImportError("OpenCV and numpy are required for image processing")
        
        image_data = image_file.read()
        pil_image = Image.open(io.BytesIO(image_data))
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        return np.array(pil_image)
    
    def _save_analysis_results(self, user, image_file, analysis_result):
        """Save analysis results to database"""
        # Same implementation as MLAnalysisView
        try:
            detections_data = [det.to_dict() for det in analysis_result.detections]
            ripeness_counts = {'Not Mature': 0, 'Mature': 0, 'Ripe': 0, 'Over Ripe': 0}
            for detection in analysis_result.detections:
                ripeness = detection.class_name
                if ripeness in ripeness_counts:
                    ripeness_counts[ripeness] += 1
            
            legacy_results = []
            for detection in analysis_result.detections:
                legacy_results.append({
                    'ripeness': detection.class_name,
                    'confidence': detection.confidence,
                    'bbox': list(detection.bbox)
                })
            
            scan_record = ScanRecord.objects.create(
                user=user,
                image=image_file,
                banana_count=len(analysis_result.detections),
                ripeness_results=legacy_results,
                avg_confidence=analysis_result.quality_metrics.get('avg_confidence', 0.0),
                overall_quality_score=analysis_result.quality_metrics.get('avg_quality_score', 0.0),
                processing_time=analysis_result.processing_time,
                model_version=analysis_result.model_version,
                detections_data=detections_data,
                quality_metrics=analysis_result.quality_metrics,
                metadata=analysis_result.metadata,
                not_mature_count=ripeness_counts['Not Mature'],
                mature_count=ripeness_counts['Mature'],
                ripe_count=ripeness_counts['Ripe'],
                over_ripe_count=ripeness_counts['Over Ripe'],
                quality_validated=True,
                has_errors=not analysis_result.success,
                error_message=analysis_result.error_message
            )
            
            return scan_record
            
        except Exception as e:
            logger.error(f"Failed to save analysis results: {e}")
            return None

class ModelPerformanceView(APIView):
    """Model performance monitoring endpoint"""
    permission_classes = [IsAdminUserProfile]
    
    def get(self, request):
        """Get model performance statistics"""
        try:
            time_period = request.query_params.get('period', 'day')  # hour, day, week, month
            model_version = request.query_params.get('version', 'latest')
            
            # Get time range
            now = timezone.now()
            if time_period == 'hour':
                start_time = now - timedelta(hours=1)
            elif time_period == 'day':
                start_time = now - timedelta(days=1)
            elif time_period == 'week':
                start_time = now - timedelta(weeks=1)
            elif time_period == 'month':
                start_time = now - timedelta(days=30)
            else:
                start_time = now - timedelta(days=1)
            
            # Query performance data
            performance_query = MLModelPerformance.objects.filter(
                timestamp__gte=start_time
            )
            
            if model_version != 'latest':
                performance_query = performance_query.filter(model_version=model_version)
            
            performance_records = performance_query.order_by('-timestamp')
            
            if not performance_records.exists():
                return Response({
                    'success': False,
                    'message': 'No performance data available for the specified period'
                })
            
            # Calculate aggregated metrics
            latest_record = performance_records.first()
            avg_metrics = performance_records.aggregate(
                avg_inference_time=Avg('avg_inference_time'),
                avg_confidence=Avg('avg_confidence'),
                avg_quality_score=Avg('avg_quality_score'),
                total_inferences=Sum('total_inferences')
            )
            
            # Get trends
            trend_data = []
            for record in performance_records[:24]:  # Last 24 records
                trend_data.append({
                    'timestamp': record.timestamp.isoformat(),
                    'inference_time': record.avg_inference_time,
                    'quality_score': record.avg_quality_score,
                    'confidence': record.avg_confidence,
                    'inferences': record.total_inferences
                })
            
            # Get scan statistics
            scan_stats = ScanRecord.objects.filter(
                timestamp__gte=start_time
            ).aggregate(
                total_scans=Count('id'),
                total_bananas=Sum('banana_count'),
                avg_processing_time=Avg('processing_time'),
                error_count=Count('id', filter=Q(has_errors=True))
            )
            
            return Response({
                'success': True,
                'time_period': time_period,
                'model_version': latest_record.model_version if latest_record else 'unknown',
                'metrics': {
                    'avg_inference_time': avg_metrics['avg_inference_time'] or 0.0,
                    'avg_confidence': avg_metrics['avg_confidence'] or 0.0,
                    'avg_quality_score': avg_metrics['avg_quality_score'] or 0.0,
                    'total_inferences': avg_metrics['total_inferences'] or 0,
                    'total_scans': scan_stats['total_scans'] or 0,
                    'total_bananas': scan_stats['total_bananas'] or 0,
                    'avg_processing_time': scan_stats['avg_processing_time'] or 0.0,
                    'error_rate': (scan_stats['error_count'] or 0) / max(scan_stats['total_scans'] or 1, 1) * 100
                },
                'trends': trend_data,
                'class_distribution': latest_record.class_distribution if latest_record else {}
            })
            
        except Exception as e:
            logger.error(f"Performance query failed: {e}")
            return Response({
                'success': False,
                'error_message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    permission_classes = [IsAdminUserProfile]

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        categories = self.queryset.values_list('category', flat=True).distinct()
        data = {}
        for category in categories:
            settings = self.queryset.filter(category=category)
            data[category] = SystemSettingSerializer(settings, many=True).data
        return Response(data)

class ActivityLogViewSet(viewsets.ModelViewSet):
    queryset = ActivityLog.objects.all().order_by('-timestamp')
    serializer_class = ActivityLogSerializer

    @action(detail=False, methods=['get'])
    def recent(self, request):
        recent_activities = ActivityLog.objects.order_by('-timestamp')[:10]
        return Response(ActivityLogSerializer(recent_activities, many=True).data)

class QualityAlertViewSet(viewsets.ModelViewSet):
    """Quality alerts management"""
    queryset = QualityAlert.objects.all()
    serializer_class = QualityAlertSerializer
    permission_classes = [IsAdminUserProfile]
    
    @action(detail=False, methods=['get'])
    def unresolved(self, request):
        """Get unresolved alerts"""
        unresolved_alerts = self.queryset.filter(is_resolved=False)
        return Response(QualityAlertSerializer(unresolved_alerts, many=True).data)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark alert as resolved"""
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.resolved_by = request.user
        alert.save()
        return Response({'success': True, 'message': 'Alert resolved'})

class DashboardOverviewView(APIView):
    def get(self, request):
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        total_users = User.objects.count()
        active_users = User.objects.filter(last_login__gte=week_ago).count()
        total_scans = ScanRecord.objects.count()
        # Calculate new scans this month
        new_this_month = ScanRecord.objects.filter(
            timestamp__year=now.year,
            timestamp__month=now.month
        ).count()
        
        # Enhanced metrics
        avg_quality_score = ScanRecord.objects.aggregate(avg=Avg('overall_quality_score'))['avg'] or 0.0
        error_rate = ScanRecord.objects.filter(has_errors=True).count() / max(total_scans, 1) * 100
        
        # System uptime is static for now
        return Response({
            'totalUsers': total_users,
            'activeUsers': active_users,
            'totalScans': total_scans,
            'newThisMonth': new_this_month,
            'systemUptime': "99.9%",
            'avgQualityScore': round(avg_quality_score, 2),
            'errorRate': round(error_rate, 2)
        })

class AnalyticsOverviewView(APIView):
    permission_classes = [IsAdminUserProfile]

    def get(self, request):
        from .models import ScanRecord, Profile
        from django.contrib.auth.models import User
        from django.utils import timezone
        import calendar

        # Key Metrics
        total_scans = ScanRecord.objects.count()
        total_users = User.objects.count()
        total_bananas = ScanRecord.objects.aggregate(total=Sum('banana_count'))['total'] or 0
        avg_confidence = ScanRecord.objects.aggregate(avg=Avg('avg_confidence'))['avg'] or 0.0
        
        # Enhanced metrics
        avg_quality_score = ScanRecord.objects.aggregate(avg=Avg('overall_quality_score'))['avg'] or 0.0
        avg_processing_time = ScanRecord.objects.aggregate(avg=Avg('processing_time'))['avg'] or 0.0

        # Enhanced Ripeness Distribution (using new fields)
        ripeness_distribution = {
            'Not Mature': ScanRecord.objects.aggregate(total=Sum('not_mature_count'))['total'] or 0,
            'Mature': ScanRecord.objects.aggregate(total=Sum('mature_count'))['total'] or 0,
            'Ripe': ScanRecord.objects.aggregate(total=Sum('ripe_count'))['total'] or 0,
            'Over Ripe': ScanRecord.objects.aggregate(total=Sum('over_ripe_count'))['total'] or 0,
        }

        # User Growth (last 6 months)
        now = timezone.now()
        user_growth = []
        for i in range(5, -1, -1):
            month = (now.month - i - 1) % 12 + 1
            year = now.year if now.month - i > 0 else now.year - 1
            month_name = calendar.month_abbr[month]
            users_in_month = User.objects.filter(date_joined__year=year, date_joined__month=month).count()
            scans_in_month = ScanRecord.objects.filter(timestamp__year=year, timestamp__month=month).count()
            user_growth.append({
                'month': month_name,
                'users': users_in_month,
                'scans': scans_in_month
            })

        # Top Performers (top 5 by scan count)
        scan_counts = ScanRecord.objects.values('user').annotate(count=Count('id')).order_by('-count')[:5]
        top_performers = []
        for entry in scan_counts:
            user = User.objects.get(id=entry['user'])
            user_scans = ScanRecord.objects.filter(user=user)
            avg_accuracy = user_scans.aggregate(avg=Avg('avg_confidence'))['avg'] or 0.0
            avg_quality = user_scans.aggregate(avg=Avg('overall_quality_score'))['avg'] or 0.0
            top_performers.append({
                'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'email': user.email,
                'scans': entry['count'],
                'accuracy': round(avg_accuracy, 2),
                'quality_score': round(avg_quality, 2)
            })

        return Response({
            'totalScans': total_scans,
            'totalUsers': total_users,
            'totalBananas': total_bananas,
            'avgConfidence': round(avg_confidence, 2),
            'avgQualityScore': round(avg_quality_score, 2),
            'avgProcessingTime': round(avg_processing_time, 3),
            'ripenessDistribution': ripeness_distribution,
            'userGrowth': user_growth,
            'topPerformers': top_performers
        })
