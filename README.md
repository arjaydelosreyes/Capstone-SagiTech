# Capstone-SagiTech: Fullstack Integration Guide

## Python Version Policy
**All backend development, installations, and virtual environments must use Python 3.10.**
- This ensures compatibility with Django, Django REST Framework, and all major Machine Learning/AI libraries (TensorFlow, PyTorch, scikit-learn, etc.).
- Do not use Python 3.13 or any other version for backend or ML/AI code.
- When creating a virtual environment, always run:
  ```powershell
  python3.10 -m venv venv
  # or specify the full path to python3.10 if needed
  ```
- Always activate the venv before installing packages or running backend code.

---

## Overview
This guide explains how to integrate your React (Vite + Tailwind) frontend with a Django backend using Django REST Framework and an SQLite3 database. It covers backend setup, API creation, and best practices for frontend-backend communication (without using localStorage).

---

## 1. Backend: Django + Django REST Framework + SQLite3

### 1.1. Setup Django Project
```bash
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install django djangorestframework
```

### 1.2. Create Project & App
```bash
django-admin startproject backend
cd backend
django-admin startapp api
```

### 1.3. Configure Installed Apps
In `backend/settings.py`:
```python
INSTALLED_APPS = [
    ...
    'rest_framework',
    'api',
]
```

### 1.4. Database (SQLite3)
SQLite3 is the default for Django. No changes needed unless you want to customize the path in `settings.py`.

### 1.5. Create Models (Example: ScanResult, User)
In `api/models.py`:
```python
from django.db import models
from django.contrib.auth.models import User

class ScanResult(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='scans/')
    banana_count = models.IntegerField()
    confidence = models.FloatField()
    ripeness = models.CharField(max_length=50)
    timestamp = models.DateTimeField(auto_now_add=True)
```

### 1.6. Migrate Database
```bash
python manage.py makemigrations
python manage.py migrate
```

### 1.7. Create Serializers
In `api/serializers.py`:
```python
from rest_framework import serializers
from .models import ScanResult

class ScanResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScanResult
        fields = '__all__'
```

### 1.8. Create API Views
In `api/views.py`:
```python
from rest_framework import viewsets
from .models import ScanResult
from .serializers import ScanResultSerializer

class ScanResultViewSet(viewsets.ModelViewSet):
    queryset = ScanResult.objects.all()
    serializer_class = ScanResultSerializer
```

### 1.9. Register API Routes
In `api/urls.py`:
```python
from rest_framework import routers
from .views import ScanResultViewSet
from django.urls import path, include

router = routers.DefaultRouter()
router.register(r'scans', ScanResultViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
```
In `backend/urls.py`:
```python
from django.urls import path, include

urlpatterns = [
    path('api/', include('api.urls')),
]
```

### 1.10. Enable CORS (for frontend-backend communication)
```bash
pip install django-cors-headers
```
In `settings.py`:
```python
INSTALLED_APPS += ['corsheaders']
MIDDLEWARE = ['corsheaders.middleware.CorsMiddleware'] + MIDDLEWARE
CORS_ALLOW_ALL_ORIGINS = True  # For development only
```

---

## 2. Frontend: React (Vite) + API Integration

### 2.1. API Service Layer Example
Create `src/api/scans.ts`:
```ts
export async function getRecentScans(userId: string) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/scans/?user=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch scans');
  return res.json();
}

export async function createScan(scanData: FormData) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/scans/`, {
    method: 'POST',
    body: scanData,
  });
  if (!res.ok) throw new Error('Failed to create scan');
  return res.json();
}
```

### 2.2. Environment Variables
In your frontend `.env`:
```
VITE_API_URL=http://localhost:8000
```

### 2.3. Usage in Components
```ts
import { getRecentScans } from '@/api/scans';

useEffect(() => {
  getRecentScans(user.id).then(setRecentScans);
}, [user.id]);
```

### 2.4. No localStorage for Data
- All data is fetched from the backend via API calls.
- Only use localStorage for non-sensitive, UI-only preferences if needed.

---

## 3. Authentication (Recommended)
- Use Django REST Framework’s JWT or session authentication.
- Store tokens securely (preferably in HTTP-only cookies).
- Send tokens with each API request (see DRF docs for setup).

---

## 4. Best Practices
- Use TypeScript types/interfaces for all API data.
- Handle loading and error states in the UI.
- Use React Query or SWR for advanced data fetching/caching.
- Keep API URLs and secrets in environment variables.
- Document your API endpoints and expected data shapes.

---

## 5. Resources
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Django CORS Headers](https://pypi.org/project/django-cors-headers/)
- [React Query](https://tanstack.com/query/latest)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

**With this setup, your frontend will interact with your Django backend via RESTful APIs, storing all data in SQLite3 and never using localStorage for persistent app data.** 