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
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='scans/')
    timestamp = models.DateTimeField(auto_now_add=True)
    banana_count = models.IntegerField(default=0)
    ripeness_results = models.JSONField(default=list)  # List of {ripeness, confidence, bbox}
    avg_confidence = models.FloatField(default=0.0)

    def __str__(self):
        return f"Scan by {self.user.username} on {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"

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
