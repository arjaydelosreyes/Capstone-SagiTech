# Capstone-SagiTech: Backend Step-by-Step Guide (Django + REST + API)

This guide provides clear, sequential instructions for building your backend logic using Django, Django REST Framework, and API endpoints. It ensures all important data (User, ScanResult, etc.) is saved successfully and helps you avoid confusion in the future.

---

## 1. Project Setup

### 1.1. Create and Activate Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
```

### 1.2. Install Dependencies
```bash
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers
```

### 1.3. Start Django Project and App
```bash
django-admin startproject backend
cd backend
django-admin startapp api
```

---

## 2. Configure Django Settings

### 2.1. Add Apps to `INSTALLED_APPS`
In `backend/settings.py`:
```python
INSTALLED_APPS = [
    ...
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'api',
]
```

### 2.2. Add Middleware
```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    ...  # existing middleware
]
CORS_ALLOW_ALL_ORIGINS = True  # For development only
```

### 2.3. REST Framework Settings
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}
```

---

## 3. Models

### 3.1. User Model
- Use Django's built-in User model for authentication.
- To add a `role` field, create a Profile model:

```python
# api/models.py
from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=[('farmer', 'Farmer'), ('admin', 'Admin')])
```

### 3.2. ScanResult Model
```python
class ScanResult(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='scans/')
    banana_count = models.IntegerField()
    confidence = models.FloatField()
    ripeness = models.CharField(max_length=50)
    timestamp = models.DateTimeField(auto_now_add=True)
```

---

## 4. Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

---

## 5. Serializers

### 5.1. Create Serializers in `api/serializers.py`
```python
from rest_framework import serializers
from .models import ScanResult, Profile
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    class Meta:
        model = Profile
        fields = ['user', 'role']

class ScanResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScanResult
        fields = '__all__'
```

---

## 6. Views (API Logic)

### 6.1. Create ViewSets in `api/views.py`
```python
from rest_framework import viewsets
from .models import ScanResult, Profile
from .serializers import ScanResultSerializer, ProfileSerializer
from rest_framework.permissions import IsAuthenticated

class ScanResultViewSet(viewsets.ModelViewSet):
    queryset = ScanResult.objects.all()
    serializer_class = ScanResultSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
```

---

## 7. URLs (API Endpoints)

### 7.1. In `api/urls.py`
```python
from rest_framework import routers
from .views import ScanResultViewSet, ProfileViewSet
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = routers.DefaultRouter()
router.register(r'scans', ScanResultViewSet)
router.register(r'profiles', ProfileViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
```

### 7.2. In `backend/urls.py`
```python
from django.urls import path, include

urlpatterns = [
    path('api/', include('api.urls')),
]
```

---

## 8. User Registration & Authentication
- Use Django admin to create users, or create a registration API endpoint if needed.
- Use `/api/token/` to obtain JWT tokens for login.
- Use `/api/token/refresh/` to refresh tokens.
- All protected endpoints require the `Authorization: Bearer <token>` header.

---

## 9. Testing Your API
- Use [Postman](https://www.postman.com/) or [httpie](https://httpie.io/) to test endpoints.
- Example: Get JWT token
  ```bash
  http POST http://localhost:8000/api/token/ username='youruser' password='yourpass'
  ```
- Example: Create a scan (with token)
  ```bash
  http POST http://localhost:8000/api/scans/ banana_count=5 confidence=92.5 ripeness='ripe' "Authorization:Bearer <your_token>"
  ```

---

## 10. Best Practices
- Always use serializers for input/output validation.
- Use permissions to protect sensitive endpoints.
- Store images/media in a proper media folder and serve them securely.
- Document your API endpoints and expected data shapes.

---

**Follow these steps to ensure all important data is saved in your database and your backend is ready for frontend integration!** 