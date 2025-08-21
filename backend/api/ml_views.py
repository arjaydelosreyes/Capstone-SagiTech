"""
ML Views for SagiTech - Single endpoint architecture for banana prediction
CRITICAL: ONE FUNCTION = ONE ENDPOINT ONLY
"""

import os
import time
import logging
from datetime import datetime
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from .models import ScanRecord, ActivityLog
from .serializers import ScanRecordSerializer
from ml.services.unified_ml_service import get_ml_service

logger = logging.getLogger(__name__)

class PredictionView(APIView):
    """
    SINGLE ENDPOINT for complete prediction pipeline
    Handles: image upload → ML processing → result storage → response
    NO separate endpoints for upload/process/results
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        """
        Complete prediction pipeline in ONE endpoint
        """
        start_time = time.time()
        
        # Enhanced logging with console groups equivalent
        logger.info("=" * 50)
        logger.info("🔍 BANANA PREDICTION ANALYSIS STARTED")
        logger.info(f"User: {request.user.username} (ID: {request.user.id})")
        logger.info(f"Timestamp: {datetime.now().isoformat()}")
        logger.info("=" * 50)

        try:
            # Step 1: Validate Image Input
            logger.info("📋 Step 1: Validating image input...")
            image_file = request.FILES.get('image')
            if not image_file:
                logger.error("❌ No image file provided")
                return Response({
                    'error': 'No image provided',
                    'details': 'Please upload an image file'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate file size (10MB limit)
            max_size = 10 * 1024 * 1024  # 10MB
            if image_file.size > max_size:
                logger.error(f"❌ Image too large: {image_file.size} bytes (max: {max_size})")
                return Response({
                    'error': 'Image too large',
                    'details': f'Image size ({image_file.size} bytes) exceeds 10MB limit'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate file format (enhanced WebP support)
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
            content_type = image_file.content_type.lower()
            
            # Handle various WebP MIME types
            if 'webp' in content_type or content_type == 'image/webp':
                content_type = 'image/webp'
            
            if content_type not in allowed_types:
                logger.error(f"❌ Invalid file type: {image_file.content_type}")
                return Response({
                    'error': 'Invalid file format',
                    'details': f'Supported formats: JPEG, PNG, WebP. Got: {image_file.content_type}. If using WebP, ensure the file is valid.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Additional WebP validation
            if content_type == 'image/webp':
                try:
                    from PIL import Image
                    # Test if WebP file can be opened
                    test_image = Image.open(image_file)
                    test_image.verify()
                    image_file.seek(0)  # Reset file pointer
                    logger.info(f"✅ WebP file validated: {image_file.name}")
                except Exception as webp_error:
                    logger.error(f"❌ WebP validation failed: {webp_error}")
                    return Response({
                        'error': 'Invalid WebP file',
                        'details': 'The WebP file appears to be corrupted or invalid. Please try converting to JPEG or PNG.'
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Get analysis mode
            mode = request.data.get('mode', 'standard')
            if mode not in ['fast', 'standard', 'high_recall']:
                mode = 'standard'

            logger.info(f"✅ Image validation passed:")
            logger.info(f"   - File: {image_file.name}")
            logger.info(f"   - Size: {image_file.size} bytes")
            logger.info(f"   - Type: {image_file.content_type}")
            logger.info(f"   - Mode: {mode}")

            # Step 2: Create Database Record
            logger.info("💾 Step 2: Creating database record...")
            scan_record = ScanRecord.objects.create(
                user=request.user,
                image=image_file,
                banana_count=0,  # Will be updated after analysis
                ripeness_results=[],  # Will be updated after analysis
                avg_confidence=0.0  # Will be updated after analysis
            )
            logger.info(f"✅ Database record created: ID {scan_record.id}")

            # Step 3: Run ML Analysis
            logger.info("🤖 Step 3: Running ML analysis...")
            try:
                ml_service = get_ml_service()
                
                # Store image metadata for debugging
                image_metadata = {
                    'original_name': image_file.name,
                    'size': image_file.size,
                    'content_type': image_file.content_type,
                    'upload_timestamp': datetime.now().isoformat()
                }
                
                # Use the unified ML service for analysis
                analysis_result = ml_service.analyze_image_from_upload(
                    uploaded_file=image_file,
                    user_id=str(request.user.id),
                    mode=mode
                )
                
                logger.info(f"✅ ML analysis completed:")
                logger.info(f"   - Total bananas detected: {analysis_result.total_count}")
                logger.info(f"   - Average confidence: {analysis_result.average_confidence:.2f}")
                logger.info(f"   - Dominant ripeness: {analysis_result.dominant_ripeness}")
                logger.info(f"   - Processing time: {analysis_result.processing_metadata.get('processing_time', 0):.3f}s")

            except Exception as ml_error:
                logger.error(f"❌ ML analysis failed: {str(ml_error)}")
                logger.error(f"   Error type: {type(ml_error).__name__}")
                logger.error(f"   Stack trace: {str(ml_error.__traceback__)}")
                
                # Update database record with error info instead of deleting
                scan_record.error_message = str(ml_error)
                scan_record.retry_count += 1
                scan_record.image_metadata = image_metadata
                scan_record.save()
                
                return Response({
                    'error': 'AI analysis failed',
                    'details': 'The banana detection model encountered an error. Please try again with a different image.',
                    'technical_details': str(ml_error) if settings.DEBUG else None,
                    'scan_id': scan_record.id,  # Return ID for potential retry
                    'retry_count': scan_record.retry_count
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Step 4: Process ML Results
            logger.info("⚙️ Step 4: Processing ML results...")
            
            # Convert analysis result to Django format
            ripeness_results = []
            for detection in analysis_result.detections:
                ripeness_results.append({
                    'ripeness': detection.ripeness.value,  # Convert enum to string
                    'confidence': detection.confidence,
                    'bbox': list(detection.bbox),
                    'centroid': list(detection.centroid),
                    'area': detection.area,
                    'quality_score': detection.quality_score
                })

            # Convert ripeness distribution to match frontend expectations
            ripeness_distribution = {}
            for ripeness_stage, count in analysis_result.ripeness_distribution.items():
                # Convert enum keys to string format expected by frontend
                stage_name = ripeness_stage.value.lower().replace(' ', '_')
                ripeness_distribution[stage_name] = count

            logger.info(f"✅ Results processed:")
            logger.info(f"   - Ripeness distribution: {ripeness_distribution}")
            logger.info(f"   - Individual detections: {len(ripeness_results)}")

            # Step 5: Update Database Record
            logger.info("💾 Step 5: Updating database record...")
            scan_record.banana_count = analysis_result.total_count
            scan_record.ripeness_results = ripeness_results
            scan_record.avg_confidence = analysis_result.average_confidence
            scan_record.analysis_mode = mode
            scan_record.processing_time = analysis_result.processing_metadata.get('processing_time', 0)
            scan_record.model_version = analysis_result.processing_metadata.get('model_version', 'unknown')
            scan_record.confidence_threshold = analysis_result.processing_metadata.get('confidence_threshold', 0.5)
            scan_record.quality_score = getattr(analysis_result, 'quality_score', None)
            scan_record.has_segmentation = analysis_result.processing_metadata.get('has_segmentation', False)
            scan_record.image_metadata = image_metadata
            scan_record.error_message = None  # Clear any previous errors
            scan_record.save()
            
            logger.info(f"✅ Database record updated: ID {scan_record.id}")

            # Step 6: Log Activity
            ActivityLog.objects.create(
                user=request.user,
                action='banana_prediction',
                description=f'Analyzed image with {analysis_result.total_count} bananas detected',
                ip_address=self._get_client_ip(request),
                metadata={
                    'scan_id': scan_record.id,
                    'total_count': analysis_result.total_count,
                    'mode': mode,
                    'processing_time': analysis_result.processing_metadata.get('processing_time', 0),
                    'model_version': analysis_result.processing_metadata.get('model_version', 'unknown')
                }
            )

            # Step 7: Return Complete Response
            total_time = time.time() - start_time
            logger.info(f"🎉 PREDICTION COMPLETED SUCCESSFULLY")
            logger.info(f"   - Total processing time: {total_time:.3f}s")
            logger.info(f"   - Bananas detected: {analysis_result.total_count}")
            logger.info(f"   - Average confidence: {analysis_result.average_confidence:.2f}")
            logger.info("=" * 50)

            response_data = {
                'id': scan_record.id,
                'image_url': request.build_absolute_uri(scan_record.image.url),
                'total_count': analysis_result.total_count,
                'ripeness_distribution': ripeness_distribution,
                'confidence': round(analysis_result.average_confidence, 2),
                'bounding_boxes': ripeness_results,
                'processed_at': scan_record.timestamp.isoformat(),
                'processing_metadata': {
                    'model_version': analysis_result.processing_metadata.get('model_version', 'unknown'),
                    'processing_time': round(total_time, 3),
                    'analysis_mode': mode,
                    'confidence_threshold': analysis_result.processing_metadata.get('confidence_threshold', 0.5),
                    'has_segmentation': analysis_result.processing_metadata.get('has_segmentation', False)
                }
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            # Comprehensive error logging
            logger.error("💥 PREDICTION PIPELINE FAILED")
            logger.error(f"   Error: {str(e)}")
            logger.error(f"   Error type: {type(e).__name__}")
            logger.error(f"   User: {request.user.username}")
            logger.error(f"   Total time: {time.time() - start_time:.3f}s")
            logger.error("=" * 50)
            
            # Log activity for failed prediction
            try:
                ActivityLog.objects.create(
                    user=request.user,
                    action='banana_prediction_failed',
                    description=f'Prediction failed: {str(e)}',
                    ip_address=self._get_client_ip(request),
                    metadata={
                        'error': str(e),
                        'error_type': type(e).__name__,
                        'mode': mode if 'mode' in locals() else 'unknown'
                    }
                )
            except:
                pass  # Don't fail on logging failure

            return Response({
                'error': 'Prediction pipeline failed',
                'details': 'An unexpected error occurred during image analysis',
                'technical_details': str(e) if settings.DEBUG else None,
                'timestamp': datetime.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PredictionDetailView(APIView):
    """
    SINGLE ENDPOINT for retrieving specific prediction by ID
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """Get specific prediction by ID"""
        try:
            logger.info(f"📋 Fetching prediction ID: {pk} for user: {request.user.username}")
            
            scan_record = ScanRecord.objects.get(id=pk, user=request.user)
            serializer = ScanRecordSerializer(scan_record)
            
            # Convert to format expected by frontend
            data = serializer.data
            response_data = {
                'id': data['id'],
                'image_url': data['image'],
                'total_count': data['banana_count'],
                'ripeness_distribution': self._convert_ripeness_distribution(data['ripeness_results']),
                'confidence': data['avg_confidence'],
                'bounding_boxes': data['ripeness_results'],
                'processed_at': data['timestamp'],
                'processing_metadata': {
                    'model_version': 'unknown',  # TODO: Store in database
                    'processing_time': 0,  # TODO: Store in database
                    'analysis_mode': 'standard',  # TODO: Store in database
                    'confidence_threshold': 0.5,  # TODO: Store in database
                }
            }
            
            logger.info(f"✅ Prediction {pk} retrieved successfully")
            return Response(response_data, status=status.HTTP_200_OK)
            
        except ScanRecord.DoesNotExist:
            logger.warning(f"⚠️ Prediction {pk} not found for user {request.user.username}")
            return Response({
                'error': 'Prediction not found',
                'details': f'No prediction with ID {pk} found for this user'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"❌ Failed to fetch prediction {pk}: {str(e)}")
            return Response({
                'error': 'Failed to fetch prediction',
                'details': str(e) if settings.DEBUG else 'An unexpected error occurred'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _convert_ripeness_distribution(self, ripeness_results):
        """Convert ripeness results to distribution format"""
        distribution = {
            'not_mature': 0,
            'mature': 0,
            'ripe': 0,
            'over_ripe': 0
        }
        
        for result in ripeness_results:
            ripeness = result.get('ripeness', '').lower().replace(' ', '_')
            if ripeness in distribution:
                distribution[ripeness] += 1
                
        return distribution


class PredictionListView(APIView):
    """
    SINGLE ENDPOINT for listing all predictions with pagination
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """List all predictions for authenticated user with pagination"""
        try:
            logger.info(f"📋 Fetching prediction list for user: {request.user.username}")
            
            # Get page parameter
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            
            # Get user's scan records
            scan_records = ScanRecord.objects.filter(user=request.user).order_by('-timestamp')
            
            # Simple pagination
            start = (page - 1) * page_size
            end = start + page_size
            paginated_records = scan_records[start:end]
            
            # Serialize data
            serializer = ScanRecordSerializer(paginated_records, many=True)
            
            # Calculate pagination info
            total_count = scan_records.count()
            has_next = end < total_count
            has_previous = page > 1
            
            response_data = {
                'results': serializer.data,
                'count': total_count,
                'next': f"?page={page + 1}" if has_next else None,
                'previous': f"?page={page - 1}" if has_previous else None,
                'page': page,
                'page_size': page_size
            }
            
            logger.info(f"✅ Prediction list retrieved: {len(paginated_records)} records (page {page})")
            return Response(response_data, status=status.HTTP_200_OK)
            
        except ValueError as e:
            logger.error(f"❌ Invalid pagination parameters: {str(e)}")
            return Response({
                'error': 'Invalid parameters',
                'details': 'Page and page_size must be valid integers'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"❌ Failed to fetch prediction list: {str(e)}")
            return Response({
                'error': 'Failed to fetch predictions',
                'details': str(e) if settings.DEBUG else 'An unexpected error occurred'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AnalyticsView(APIView):
    """
    SINGLE ENDPOINT for aggregated analytics data
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get analytics data for authenticated user"""
        try:
            logger.info(f"📊 Fetching analytics for user: {request.user.username}")
            
            # Get user's scan records
            user_scans = ScanRecord.objects.filter(user=request.user)
            
            # Calculate basic statistics
            total_scans = user_scans.count()
            total_bananas = sum(scan.banana_count for scan in user_scans)
            avg_confidence = sum(scan.avg_confidence for scan in user_scans) / total_scans if total_scans > 0 else 0.0
            
            # Calculate ripeness distribution
            ripeness_distribution = {
                'not_mature': 0,
                'mature': 0,
                'ripe': 0,
                'over_ripe': 0
            }
            
            for scan in user_scans:
                for result in scan.ripeness_results:
                    ripeness = result.get('ripeness', '').lower().replace(' ', '_')
                    if ripeness in ripeness_distribution:
                        ripeness_distribution[ripeness] += 1
            
            # Recent scan history (last 10)
            recent_scans = user_scans.order_by('-timestamp')[:10]
            scan_history = ScanRecordSerializer(recent_scans, many=True).data
            
            response_data = {
                'totalScans': total_scans,
                'totalBananas': total_bananas,
                'avgConfidence': round(avg_confidence, 2),
                'ripenessDistribution': ripeness_distribution,
                'scanHistory': scan_history,
                'lastScanDate': recent_scans.first().timestamp.isoformat() if recent_scans.exists() else None
            }
            
            logger.info(f"✅ Analytics retrieved: {total_scans} scans, {total_bananas} bananas")
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Failed to fetch analytics: {str(e)}")
            return Response({
                'error': 'Failed to fetch analytics',
                'details': str(e) if settings.DEBUG else 'An unexpected error occurred'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)