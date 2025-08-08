from django.db import models
from django.contrib.auth.models import User
from django.conf import settings

# Create your models here.

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=[('farmer', 'Farmer'), ('admin', 'Admin')])
    # Email verification tracking
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)
    email_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} ({self.role})"

class ScanRecord(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='scans/')
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Basic metrics (backward compatibility)
    banana_count = models.IntegerField(default=0)
    ripeness_results = models.JSONField(default=list)  # List of {ripeness, confidence, bbox}
    avg_confidence = models.FloatField(default=0.0)
    
    # Enhanced ML metrics
    overall_quality_score = models.FloatField(default=0.0)
    processing_time = models.FloatField(default=0.0)  # Inference time in seconds
    model_version = models.CharField(max_length=64, default='unknown')
    
    # Detailed detection data (polygon segmentation)
    detections_data = models.JSONField(default=list)  # List of BananaDetection objects
    quality_metrics = models.JSONField(default=dict)  # Quality analysis metrics
    metadata = models.JSONField(default=dict)  # Additional processing metadata
    
    # Ripeness distribution
    mature_count = models.IntegerField(default=0)  # Not Mature
    not_mature_count = models.IntegerField(default=0)  # Mature  
    ripe_count = models.IntegerField(default=0)  # Ripe
    over_ripe_count = models.IntegerField(default=0)  # Over Ripe
    
    # Validation flags
    quality_validated = models.BooleanField(default=False)
    has_errors = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['model_version']),
            models.Index(fields=['overall_quality_score']),
        ]

    def __str__(self):
        return f"Scan by {self.user.username} on {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
    
    def get_ripeness_distribution(self):
        """Get ripeness distribution as a dictionary"""
        return {
            'Not Mature': self.not_mature_count,
            'Mature': self.mature_count,
            'Ripe': self.ripe_count,
            'Over Ripe': self.over_ripe_count
        }
    
    def update_ripeness_counts(self):
        """Update ripeness counts based on detections_data"""
        counts = {'Not Mature': 0, 'Mature': 0, 'Ripe': 0, 'Over Ripe': 0}
        
        for detection in self.detections_data:
            ripeness = detection.get('class_name', '')
            if ripeness in counts:
                counts[ripeness] += 1
        
        self.not_mature_count = counts['Not Mature']
        self.mature_count = counts['Mature']
        self.ripe_count = counts['Ripe']
        self.over_ripe_count = counts['Over Ripe']
        self.banana_count = sum(counts.values())

class SystemSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    category = models.CharField(max_length=50)  # 'system', 'ai', 'notifications', 'security'
    data_type = models.CharField(max_length=20, default='string')  # 'string', 'boolean', 'integer', 'float'
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.key} ({self.category})"

class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    action = models.CharField(max_length=100)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict)  # Additional context

    def __str__(self):
        return f"{self.user} - {self.action} at {self.timestamp}"

class MLModelPerformance(models.Model):
    """Track ML model performance metrics over time"""
    model_version = models.CharField(max_length=64)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Performance metrics
    avg_inference_time = models.FloatField()
    max_inference_time = models.FloatField()
    min_inference_time = models.FloatField()
    total_inferences = models.IntegerField()
    
    # Quality metrics
    avg_confidence = models.FloatField()
    avg_quality_score = models.FloatField()
    
    # Distribution metrics
    class_distribution = models.JSONField(default=dict)
    error_rate = models.FloatField(default=0.0)
    
    # System metrics
    memory_usage = models.FloatField(null=True, blank=True)  # MB
    gpu_utilization = models.FloatField(null=True, blank=True)  # %
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['model_version', '-timestamp']),
        ]
    
    def __str__(self):
        return f"Performance {self.model_version} at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"

class QualityAlert(models.Model):
    """Track quality issues and model drift"""
    ALERT_TYPES = [
        ('low_confidence', 'Low Confidence'),
        ('model_drift', 'Model Drift'),
        ('performance_degradation', 'Performance Degradation'),
        ('anomaly_detection', 'Anomaly Detection'),
        ('system_error', 'System Error'),
    ]
    
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    alert_type = models.CharField(max_length=50, choices=ALERT_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Alert details
    title = models.CharField(max_length=200)
    description = models.TextField()
    scan_record = models.ForeignKey(ScanRecord, on_delete=models.CASCADE, null=True, blank=True)
    
    # Status tracking
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Metadata
    alert_data = models.JSONField(default=dict)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['alert_type', '-timestamp']),
            models.Index(fields=['severity', '-timestamp']),
            models.Index(fields=['is_resolved']),
        ]
    
    def __str__(self):
        return f"{self.alert_type} - {self.severity} at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"
