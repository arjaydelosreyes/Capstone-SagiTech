from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from rest_framework import serializers

class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        return token

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # If email is present in initial_data, look up the user and inject username
        initial_data = getattr(self, 'initial_data', None)
        if initial_data and 'email' in initial_data and 'username' not in initial_data:
            from django.contrib.auth.models import User
            try:
                user = User.objects.get(email=initial_data['email'])
                self.initial_data['username'] = user.username
            except User.DoesNotExist:
                pass  # Let validation handle this

    def validate(self, attrs):
        print("DEBUG: attrs at start of validate:", attrs)
        print("DEBUG: self.initial_data at start of validate:", getattr(self, 'initial_data', None))
        email = attrs.get("email")
        password = attrs.get("password")
        print(f"DEBUG: Login attempt for email={email}")
        if not email or not password:
            print("DEBUG: Missing email or password")
            raise serializers.ValidationError("Email and password are required")
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            print("DEBUG: No user with this email")
            raise serializers.ValidationError("No user with this email")
        if not user.is_active:
            print("DEBUG: User is not active")
            raise serializers.ValidationError("User account is not active")
        attrs["username"] = user.username
        self.initial_data["username"] = user.username  # Ensure parent serializer sees username
        print(f"DEBUG: Authenticating username={user.username}")
        return super().validate(attrs)

class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer 