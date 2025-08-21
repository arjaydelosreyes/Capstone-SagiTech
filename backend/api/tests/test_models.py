"""
Unit tests for API models
"""

from django.test import TestCase
from django.contrib.auth.models import User
from api.models import ScanRecord, Profile, SystemSetting, ActivityLog


class ScanRecordModelTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        Profile.objects.create(user=self.user, role='farmer')

    def test_scan_record_creation(self):
        """Test basic scan record creation"""
        scan = ScanRecord.objects.create(
            user=self.user,
            image='test.jpg',
            banana_count=5,
            ripeness_results=[
                {'ripeness': 'mature', 'confidence': 0.9},
                {'ripeness': 'ripe', 'confidence': 0.8}
            ],
            avg_confidence=0.85
        )
        
        self.assertEqual(scan.user, self.user)
        self.assertEqual(scan.banana_count, 5)
        self.assertEqual(len(scan.ripeness_results), 2)
        self.assertEqual(scan.avg_confidence, 0.85)

    def test_ripeness_distribution_property(self):
        """Test ripeness distribution calculation"""
        scan = ScanRecord.objects.create(
            user=self.user,
            image='test.jpg',
            ripeness_results=[
                {'ripeness': 'Mature', 'confidence': 0.9},
                {'ripeness': 'Mature', 'confidence': 0.8},
                {'ripeness': 'Ripe', 'confidence': 0.7}
            ]
        )
        
        distribution = scan.ripeness_distribution
        self.assertEqual(distribution['mature'], 2)
        self.assertEqual(distribution['ripe'], 1)
        self.assertEqual(distribution['not_mature'], 0)
        self.assertEqual(distribution['over_ripe'], 0)

    def test_dominant_ripeness_property(self):
        """Test dominant ripeness calculation"""
        scan = ScanRecord.objects.create(
            user=self.user,
            image='test.jpg',
            ripeness_results=[
                {'ripeness': 'Mature', 'confidence': 0.9},
                {'ripeness': 'Mature', 'confidence': 0.8},
                {'ripeness': 'Ripe', 'confidence': 0.7}
            ]
        )
        
        self.assertEqual(scan.dominant_ripeness, 'mature')

    def test_success_rate_calculation(self):
        """Test success rate calculation based on confidence"""
        scan = ScanRecord.objects.create(
            user=self.user,
            image='test.jpg',
            ripeness_results=[
                {'ripeness': 'mature', 'confidence': 0.9},  # High confidence
                {'ripeness': 'ripe', 'confidence': 0.6},    # Low confidence
                {'ripeness': 'mature', 'confidence': 0.85}  # High confidence
            ]
        )
        
        success_rate = scan.get_success_rate()
        self.assertEqual(success_rate, 66.67)  # 2 out of 3 above 0.8

    def test_string_representation(self):
        """Test model string representation"""
        scan = ScanRecord.objects.create(
            user=self.user,
            image='test.jpg',
            banana_count=3
        )
        
        expected = f"Scan by {self.user.username} on {scan.timestamp.strftime('%Y-%m-%d %H:%M:%S')} - 3 bananas"
        self.assertEqual(str(scan), expected)


class ProfileModelTestCase(TestCase):
    def test_profile_creation(self):
        """Test profile creation"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        profile = Profile.objects.create(user=user, role='farmer')
        
        self.assertEqual(profile.user, user)
        self.assertEqual(profile.role, 'farmer')
        self.assertEqual(str(profile), f"{user.username} (farmer)")


class SystemSettingModelTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )

    def test_system_setting_creation(self):
        """Test system setting creation"""
        setting = SystemSetting.objects.create(
            key='ai_confidence_threshold',
            value='0.8',
            category='ai',
            data_type='float',
            updated_by=self.user
        )
        
        self.assertEqual(setting.key, 'ai_confidence_threshold')
        self.assertEqual(setting.value, '0.8')
        self.assertEqual(setting.category, 'ai')
        self.assertEqual(setting.data_type, 'float')


class ActivityLogModelTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_activity_log_creation(self):
        """Test activity log creation"""
        log = ActivityLog.objects.create(
            user=self.user,
            action='banana_prediction',
            description='Analyzed banana image',
            ip_address='127.0.0.1',
            metadata={'scan_id': 1, 'banana_count': 5}
        )
        
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.action, 'banana_prediction')
        self.assertEqual(log.metadata['scan_id'], 1)