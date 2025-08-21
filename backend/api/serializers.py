from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, ScanRecord, SystemSetting, ActivityLog
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
        fields = ['user', 'role']

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

class ScanRecordSerializer(serializers.ModelSerializer):
    """
    Enhanced ScanRecord serializer synchronized with frontend expectations
    """
    user = UserSerializer(read_only=True)
    ripeness = serializers.SerializerMethodField()
    ripeness_distribution = serializers.SerializerMethodField()
    dominant_ripeness = serializers.SerializerMethodField()
    success_rate = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ScanRecord
        fields = [
            'id', 'user', 'image', 'image_url', 'timestamp', 'banana_count', 
            'ripeness_results', 'avg_confidence', 'ripeness', 'ripeness_distribution',
            'dominant_ripeness', 'analysis_mode', 'processing_time', 'model_version',
            'confidence_threshold', 'quality_score', 'has_segmentation', 'success_rate',
            'error_message', 'retry_count', 'image_metadata'
        ]
        read_only_fields = ['id', 'user', 'timestamp']

    def get_ripeness(self, obj):
        """Return dominant ripeness for backward compatibility"""
        return obj.dominant_ripeness.replace('_', ' ').title()

    def get_ripeness_distribution(self, obj):
        """Return ripeness distribution"""
        return obj.ripeness_distribution

    def get_dominant_ripeness(self, obj):
        """Return dominant ripeness stage"""
        return obj.dominant_ripeness.replace('_', ' ').title()

    def get_success_rate(self, obj):
        """Return success rate percentage"""
        return round(obj.get_success_rate(), 1)

    def get_image_url(self, obj):
        """Return full image URL"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class PredictionRequestSerializer(serializers.Serializer):
    """
    Serializer for prediction request validation
    """
    image = serializers.ImageField(required=True)
    mode = serializers.ChoiceField(
        choices=['fast', 'standard', 'high_recall'],
        default='standard',
        required=False
    )
    
    def validate_image(self, value):
        """Validate uploaded image"""
        # Check file size (10MB limit)
        max_size = 10 * 1024 * 1024  # 10MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"Image too large. Maximum size is 10MB, got {value.size} bytes."
            )
        
        # Check file format
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                f"Invalid file format. Supported formats: {', '.join(allowed_types)}. "
                f"Got: {value.content_type}"
            )
        
        return value


class PredictionResponseSerializer(serializers.Serializer):
    """
    Serializer for prediction response format
    """
    id = serializers.IntegerField()
    image_url = serializers.URLField()
    total_count = serializers.IntegerField()
    ripeness_distribution = serializers.DictField()
    confidence = serializers.FloatField()
    bounding_boxes = serializers.ListField()
    processed_at = serializers.DateTimeField()
    processing_metadata = serializers.DictField() 

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