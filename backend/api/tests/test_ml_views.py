"""
Unit tests for ML Views
"""

import os
import tempfile
from unittest.mock import patch, Mock
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from PIL import Image
import io

from api.models import ScanRecord, Profile


class PredictionViewTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create test user
        self.user = User.objects.create_user(
            username='testfarmer',
            email='test@example.com',
            password='testpass123'
        )
        Profile.objects.create(user=self.user, role='farmer')
        
        # Authenticate client
        self.client.force_authenticate(user=self.user)
        
        # Create test image
        self.test_image = self._create_test_image()

    def _create_test_image(self):
        """Create a test image file"""
        image = Image.new('RGB', (100, 100), color='red')
        image_io = io.BytesIO()
        image.save(image_io, format='JPEG')
        image_io.seek(0)
        
        return SimpleUploadedFile(
            name='test_banana.jpg',
            content=image_io.getvalue(),
            content_type='image/jpeg'
        )

    @patch('api.ml_views.get_ml_service')
    def test_successful_prediction(self, mock_get_ml_service):
        """Test successful prediction flow"""
        # Mock ML service response
        mock_analysis_result = Mock()
        mock_analysis_result.total_count = 3
        mock_analysis_result.average_confidence = 0.85
        mock_analysis_result.dominant_ripeness = 'mature'
        mock_analysis_result.detections = []
        mock_analysis_result.ripeness_distribution = {'mature': 3}
        mock_analysis_result.processing_metadata = {
            'processing_time': 1.5,
            'model_version': 'test-v1.0',
            'confidence_threshold': 0.5,
            'has_segmentation': False
        }
        
        mock_ml_service = Mock()
        mock_ml_service.analyze_image_from_upload.return_value = mock_analysis_result
        mock_get_ml_service.return_value = mock_ml_service

        response = self.client.post('/api/predict/', {
            'image': self.test_image,
            'mode': 'standard'
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['total_count'], 3)
        self.assertEqual(response.data['confidence'], 85)
        
        # Check database record
        scan_record = ScanRecord.objects.get(id=response.data['id'])
        self.assertEqual(scan_record.banana_count, 3)
        self.assertEqual(scan_record.analysis_mode, 'standard')

    def test_missing_image_error(self):
        """Test error when no image is provided"""
        response = self.client.post('/api/predict/', {
            'mode': 'standard'
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'No image provided')

    def test_invalid_file_format(self):
        """Test error for invalid file format"""
        invalid_file = SimpleUploadedFile(
            name='test.txt',
            content=b'not an image',
            content_type='text/plain'
        )

        response = self.client.post('/api/predict/', {
            'image': invalid_file,
            'mode': 'standard'
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid file format', response.data['error'])

    def test_file_too_large(self):
        """Test error for oversized files"""
        # Create a large file (mock)
        large_content = b'x' * (11 * 1024 * 1024)  # 11MB
        large_file = SimpleUploadedFile(
            name='large.jpg',
            content=large_content,
            content_type='image/jpeg'
        )

        response = self.client.post('/api/predict/', {
            'image': large_file,
            'mode': 'standard'
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('too large', response.data['error'])

    @patch('api.ml_views.get_ml_service')
    def test_ml_service_error_handling(self, mock_get_ml_service):
        """Test ML service error handling"""
        mock_ml_service = Mock()
        mock_ml_service.analyze_image_from_upload.side_effect = Exception("Model failed")
        mock_get_ml_service.return_value = mock_ml_service

        response = self.client.post('/api/predict/', {
            'image': self.test_image,
            'mode': 'standard'
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn('AI analysis failed', response.data['error'])
        
        # Check that scan record was created with error info
        scan_record = ScanRecord.objects.filter(user=self.user).first()
        self.assertIsNotNone(scan_record)
        self.assertIsNotNone(scan_record.error_message)
        self.assertEqual(scan_record.retry_count, 1)

    def test_unauthenticated_request(self):
        """Test that unauthenticated requests are rejected"""
        self.client.force_authenticate(user=None)
        
        response = self.client.post('/api/predict/', {
            'image': self.test_image,
            'mode': 'standard'
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PredictionDetailViewTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create test user
        self.user = User.objects.create_user(
            username='testfarmer',
            email='test@example.com',
            password='testpass123'
        )
        Profile.objects.create(user=self.user, role='farmer')
        
        # Create test scan record
        self.scan_record = ScanRecord.objects.create(
            user=self.user,
            image='test.jpg',
            banana_count=5,
            ripeness_results=[
                {'ripeness': 'mature', 'confidence': 0.9, 'bbox': [0, 0, 100, 100]}
            ],
            avg_confidence=0.9
        )
        
        self.client.force_authenticate(user=self.user)

    def test_get_existing_prediction(self):
        """Test retrieving existing prediction"""
        response = self.client.get(f'/api/prediction/{self.scan_record.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.scan_record.id)
        self.assertEqual(response.data['total_count'], 5)

    def test_get_nonexistent_prediction(self):
        """Test error when prediction doesn't exist"""
        response = self.client.get('/api/prediction/99999/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('not found', response.data['error'])

    def test_access_other_user_prediction(self):
        """Test that users can't access other users' predictions"""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        Profile.objects.create(user=other_user, role='farmer')
        
        other_scan = ScanRecord.objects.create(
            user=other_user,
            image='other.jpg',
            banana_count=3,
            avg_confidence=0.8
        )
        
        response = self.client.get(f'/api/prediction/{other_scan.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)