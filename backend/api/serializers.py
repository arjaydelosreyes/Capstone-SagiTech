from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, ScanRecord, SystemSetting, ActivityLog, MLModelPerformance, QualityAlert
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = Profile
        fields = ['user', 'role', 'email_verified', 'email_verification_sent_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.CharField(write_only=True)
    name = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'name']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_password(self, value):
        # Enforce minimum length
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        # Use Django's built-in password validators (can be customized in settings)
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value

    def create(self, validated_data):
        role = validated_data.pop('role', 'farmer')
        name = validated_data.pop('name', '')
        first_name = ''
        last_name = ''
        if name:
            parts = name.strip().split()
            first_name = parts[0]
            if len(parts) > 1:
                last_name = ' '.join(parts[1:])
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name
        )
        Profile.objects.create(user=user, role=role)
        return user 

class BananaDetectionSerializer(serializers.Serializer):
    """Serializer for individual banana detection results"""
    class_id = serializers.IntegerField()
    class_name = serializers.CharField()
    confidence = serializers.FloatField()
    polygon = serializers.ListField(
        child=serializers.ListField(
            child=serializers.FloatField(),
            min_length=2,
            max_length=2
        )
    )
    bbox = serializers.ListField(
        child=serializers.FloatField(),
        min_length=4,
        max_length=4
    )
    area = serializers.FloatField()
    quality_score = serializers.FloatField()
    timestamp = serializers.CharField()

class QualityMetricsSerializer(serializers.Serializer):
    """Serializer for quality metrics"""
    total_detections = serializers.IntegerField()
    avg_confidence = serializers.FloatField()
    avg_quality_score = serializers.FloatField()
    detection_density = serializers.FloatField()

class ScanRecordSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    ripeness = serializers.SerializerMethodField()
    ripeness_distribution = serializers.SerializerMethodField()
    detections_data = serializers.JSONField(required=False)
    quality_metrics = serializers.JSONField(required=False)
    metadata = serializers.JSONField(required=False)

    class Meta:
        model = ScanRecord
        fields = [
            'id', 'user', 'image', 'timestamp', 'banana_count', 'ripeness_results', 
            'avg_confidence', 'ripeness', 'overall_quality_score', 'processing_time',
            'model_version', 'detections_data', 'quality_metrics', 'metadata',
            'mature_count', 'not_mature_count', 'ripe_count', 'over_ripe_count',
            'ripeness_distribution', 'quality_validated', 'has_errors', 'error_message'
        ]
        read_only_fields = ['id', 'user', 'timestamp'] 

    def get_ripeness(self, obj):
        # Return the first ripeness value if available, else None
        if obj.ripeness_results and isinstance(obj.ripeness_results, list) and len(obj.ripeness_results) > 0:
            return obj.ripeness_results[0].get('ripeness', None)
        return None 
    
    def get_ripeness_distribution(self, obj):
        """Get ripeness distribution"""
        return obj.get_ripeness_distribution()

    def create(self, validated_data):
        """Enhanced create method with ML result processing"""
        # Process detections data if provided
        detections_data = validated_data.get('detections_data', [])
        
        scan_record = super().create(validated_data)
        
        # Update ripeness counts based on detections
        if detections_data:
            scan_record.update_ripeness_counts()
            scan_record.save()
        
        return scan_record

    def update(self, instance, validated_data):
        """Enhanced update method with ML result processing"""
        # Process detections data if provided
        detections_data = validated_data.get('detections_data')
        
        instance = super().update(instance, validated_data)
        
        # Update ripeness counts if detections were updated
        if detections_data is not None:
            instance.update_ripeness_counts()
            instance.save()
        
        return instance

class EnhancedScanRecordSerializer(ScanRecordSerializer):
    """Extended serializer with full ML analysis results"""
    detections_detailed = BananaDetectionSerializer(many=True, read_only=True, source='detections_data')
    quality_metrics_detailed = QualityMetricsSerializer(read_only=True, source='quality_metrics')
    
    class Meta(ScanRecordSerializer.Meta):
        fields = ScanRecordSerializer.Meta.fields + ['detections_detailed', 'quality_metrics_detailed']

class SystemSettingSerializer(serializers.ModelSerializer):
    def validate(self, data):
        data_type = data.get('data_type', 'string')
        value = data.get('value')
        if data_type == 'boolean':
            if value not in ['true', 'false', True, False, 'True', 'False']:
                raise serializers.ValidationError("Value must be a boolean (true/false).")
        elif data_type == 'integer':
            try:
                int(value)
            except (ValueError, TypeError):
                raise serializers.ValidationError("Value must be an integer.")
        elif data_type == 'float':
            try:
                float(value)
            except (ValueError, TypeError):
                raise serializers.ValidationError("Value must be a float.")
        # Add more validation as needed
        return data
    class Meta:
        model = SystemSetting
        fields = '__all__' 

class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ActivityLog
        fields = '__all__'

class MLModelPerformanceSerializer(serializers.ModelSerializer):
    """Serializer for ML model performance tracking"""
    
    class Meta:
        model = MLModelPerformance
        fields = '__all__'
        read_only_fields = ['timestamp']

class QualityAlertSerializer(serializers.ModelSerializer):
    """Serializer for quality alerts"""
    resolved_by_username = serializers.CharField(source='resolved_by.username', read_only=True)
    scan_record_details = ScanRecordSerializer(source='scan_record', read_only=True)
    
    class Meta:
        model = QualityAlert
        fields = '__all__'
        read_only_fields = ['timestamp']

class MLAnalysisRequestSerializer(serializers.Serializer):
    """Serializer for ML analysis requests"""
    image = serializers.ImageField()
    confidence_threshold = serializers.FloatField(default=0.75, min_value=0.1, max_value=1.0)
    iou_threshold = serializers.FloatField(default=0.5, min_value=0.1, max_value=1.0)
    return_visualization = serializers.BooleanField(default=False)
    save_results = serializers.BooleanField(default=True)

class MLAnalysisResponseSerializer(serializers.Serializer):
    """Serializer for ML analysis responses"""
    success = serializers.BooleanField()
    processing_time = serializers.FloatField()
    model_version = serializers.CharField()
    
    # Detection results
    detections = BananaDetectionSerializer(many=True)
    banana_count = serializers.IntegerField()
    
    # Quality metrics
    quality_metrics = QualityMetricsSerializer()
    overall_quality_score = serializers.FloatField()
    
    # Ripeness distribution
    ripeness_distribution = serializers.DictField()
    
    # Optional visualization
    visualization_image = serializers.CharField(required=False, allow_null=True)
    
    # Error handling
    error_message = serializers.CharField(required=False, allow_null=True)
    warnings = serializers.ListField(child=serializers.CharField(), required=False)
    
    # Metadata
    metadata = serializers.DictField()

class BulkAnalysisRequestSerializer(serializers.Serializer):
    """Serializer for bulk image analysis"""
    images = serializers.ListField(
        child=serializers.ImageField(),
        min_length=1,
        max_length=50  # Limit bulk processing
    )
    confidence_threshold = serializers.FloatField(default=0.75, min_value=0.1, max_value=1.0)
    iou_threshold = serializers.FloatField(default=0.5, min_value=0.1, max_value=1.0)
    save_results = serializers.BooleanField(default=True)

class ModelPerformanceStatsSerializer(serializers.Serializer):
    """Serializer for model performance statistics"""
    model_version = serializers.CharField()
    time_period = serializers.CharField()  # 'hour', 'day', 'week', 'month'
    
    # Performance metrics
    avg_inference_time = serializers.FloatField()
    total_inferences = serializers.IntegerField()
    
    # Quality metrics
    avg_confidence = serializers.FloatField()
    avg_quality_score = serializers.FloatField()
    
    # Distribution
    class_distribution = serializers.DictField()
    error_rate = serializers.FloatField()
    
    # Trends
    performance_trend = serializers.ListField(child=serializers.DictField())
    quality_trend = serializers.ListField(child=serializers.DictField()) 