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
    user = UserSerializer(read_only=True)
    ripeness = serializers.SerializerMethodField()
    ripeness_breakdown = serializers.SerializerMethodField()
    dominant_ripeness = serializers.SerializerMethodField()

    class Meta:
        model = ScanRecord
        fields = [
            'id', 'user', 'image', 'timestamp', 'banana_count', 'ripeness_results', 
            'avg_confidence', 'ripeness', 'not_mature_count', 'mature_count', 
            'ripe_count', 'over_ripe_count', 'overall_ripeness', 'ripeness_distribution',
            'ripeness_breakdown', 'dominant_ripeness'
        ]
        read_only_fields = ['id', 'user', 'timestamp'] 

    def get_ripeness(self, obj):
        # Return the overall/dominant ripeness if available
        if obj.overall_ripeness:
            return obj.overall_ripeness
        # Fallback to the first ripeness value if available
        if obj.ripeness_results and isinstance(obj.ripeness_results, list) and len(obj.ripeness_results) > 0:
            return obj.ripeness_results[0].get('ripeness', None)
        return None

    def get_ripeness_breakdown(self, obj):
        """Get detailed breakdown of ripeness counts and percentages"""
        return obj.get_ripeness_breakdown()

    def get_dominant_ripeness(self, obj):
        """Get the most prevalent ripeness level"""
        return obj.get_dominant_ripeness()

    def create(self, validated_data):
        # Process ripeness_results to calculate distribution
        ripeness_results = validated_data.get('ripeness_results', [])
        
        # Initialize counters
        ripeness_counts = {
            'Not Mature': 0,
            'Mature': 0,
            'Ripe': 0,
            'Over Ripe': 0
        }
        
        # Count each ripeness type from results
        for result in ripeness_results:
            ripeness = result.get('ripeness', '')
            if ripeness in ripeness_counts:
                ripeness_counts[ripeness] += 1
        
        # Update individual count fields
        validated_data['not_mature_count'] = ripeness_counts['Not Mature']
        validated_data['mature_count'] = ripeness_counts['Mature']
        validated_data['ripe_count'] = ripeness_counts['Ripe']
        validated_data['over_ripe_count'] = ripeness_counts['Over Ripe']
        
        # Set ripeness distribution
        validated_data['ripeness_distribution'] = {k: v for k, v in ripeness_counts.items() if v > 0}
        
        # Set overall ripeness (most common)
        if ripeness_counts:
            overall_ripeness = max(ripeness_counts, key=ripeness_counts.get)
            if ripeness_counts[overall_ripeness] > 0:
                validated_data['overall_ripeness'] = overall_ripeness
        
        return super().create(validated_data)

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