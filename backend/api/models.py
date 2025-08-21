from django.db import models
from django.contrib.auth.models import User
from django.conf import settings

# Create your models here.

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=[('farmer', 'Farmer'), ('admin', 'Admin')])

    def __str__(self):
        return f"{self.user.username} ({self.role})"

class ScanRecord(models.Model):
    """
    Enhanced ScanRecord model synchronized with UnifiedMLService
    Stores complete banana detection and analysis results
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='scans/')
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Core detection results
    banana_count = models.IntegerField(default=0, help_text="Total number of bananas detected")
    ripeness_results = models.JSONField(default=list, help_text="List of {ripeness, confidence, bbox, centroid, area, quality_score}")
    avg_confidence = models.FloatField(default=0.0, help_text="Average confidence across all detections")
    
    # Enhanced metadata for better tracking
    analysis_mode = models.CharField(
        max_length=20, 
        choices=[('fast', 'Fast'), ('standard', 'Standard'), ('high_recall', 'High Recall')],
        default='standard',
        help_text="Analysis mode used for detection"
    )
    processing_time = models.FloatField(default=0.0, help_text="Processing time in seconds")
    model_version = models.CharField(max_length=50, default='unknown', help_text="ML model version used")
    confidence_threshold = models.FloatField(default=0.5, help_text="Confidence threshold used")
    
    # Quality metrics
    quality_score = models.FloatField(null=True, blank=True, help_text="Overall quality score of the analysis")
    has_segmentation = models.BooleanField(default=False, help_text="Whether segmentation data is available")
    
    # Error tracking
    error_message = models.TextField(null=True, blank=True, help_text="Error message if analysis failed")
    retry_count = models.IntegerField(default=0, help_text="Number of retry attempts")
    
    # Additional metadata
    image_metadata = models.JSONField(default=dict, help_text="Original image metadata (size, format, etc.)")
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['banana_count']),
        ]

    def __str__(self):
        return f"Scan by {self.user.username} on {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')} - {self.banana_count} bananas"
    
    @property
    def ripeness_distribution(self):
        """Calculate ripeness distribution from results"""
        distribution = {
            'not_mature': 0,
            'mature': 0,
            'ripe': 0,
            'over_ripe': 0
        }
        
        for result in self.ripeness_results:
            ripeness = result.get('ripeness', '').lower().replace(' ', '_')
            if ripeness in distribution:
                distribution[ripeness] += 1
                
        return distribution
    
    @property
    def dominant_ripeness(self):
        """Get the most common ripeness stage"""
        distribution = self.ripeness_distribution
        if not any(distribution.values()):
            return 'mature'  # Default
            
        return max(distribution.keys(), key=lambda k: distribution[k])
    
    def get_success_rate(self):
        """Calculate success rate based on confidence scores"""
        if not self.ripeness_results:
            return 0.0
        
        high_confidence_count = sum(
            1 for result in self.ripeness_results 
            if result.get('confidence', 0) >= 0.8
        )
        
        return (high_confidence_count / len(self.ripeness_results)) * 100

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
