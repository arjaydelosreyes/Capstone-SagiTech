"""
SagiTech API URLs - SINGLE ENDPOINT ARCHITECTURE
CRITICAL: ONE FUNCTION = ONE ENDPOINT ONLY
"""

from rest_framework import routers
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import existing views
from .views import (
    ProfileViewSet, RegisterView, ScanRecordViewSet, 
    SystemSettingViewSet, ActivityLogViewSet,
    DashboardOverviewView, AnalyticsOverviewView
)
from .authentication import EmailTokenObtainPairView

# Import new ML views with single endpoint architecture
from .ml_views import PredictionView, PredictionDetailView, PredictionListView, AnalyticsView
from .views import HealthCheckView

# Router for standard CRUD operations
router = DefaultRouter()
router.register(r'profiles', ProfileViewSet)
router.register(r'scan-records', ScanRecordViewSet, basename='scanrecord')  # Keep for backward compatibility
router.register(r'settings', SystemSettingViewSet, basename='settings')
router.register(r'activity', ActivityLogViewSet, basename='activity')

urlpatterns = router.urls

# ========== CORE ML ENDPOINTS (SINGLE ENDPOINT ARCHITECTURE) ==========
urlpatterns += [
    # SINGLE ENDPOINT for complete prediction pipeline
    path('predict/', PredictionView.as_view(), name='predict'),
    
    # SINGLE ENDPOINT for retrieving specific prediction
    path('prediction/<int:pk>/', PredictionDetailView.as_view(), name='prediction-detail'),
    
    # SINGLE ENDPOINT for listing predictions (alternative to scan-records)
    path('predictions/', PredictionListView.as_view(), name='prediction-list'),
    
    # SINGLE ENDPOINT for user analytics
    path('analytics/', AnalyticsView.as_view(), name='analytics'),
]

# ========== AUTHENTICATION ENDPOINTS ==========
urlpatterns += [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
]

# ========== ADMIN ENDPOINTS ==========
urlpatterns += [
    path('dashboard/overview/', DashboardOverviewView.as_view(), name='dashboard-overview'),
    path('analytics/overview/', AnalyticsOverviewView.as_view(), name='analytics-overview'),
]

# ========== SYSTEM ENDPOINTS ==========
urlpatterns += [
    path('health/', HealthCheckView.as_view(), name='health-check'),
]

# ========== DEPRECATED ENDPOINTS (TO BE REMOVED) ==========
# NOTE: The following endpoints violate single endpoint architecture:
# ❌ DO NOT ADD: path('upload/', ...) - Use predict/ instead
# ❌ DO NOT ADD: path('process/', ...) - Use predict/ instead  
# ❌ DO NOT ADD: path('roboflow/', ...) - Use predict/ instead
# ❌ DO NOT ADD: path('count/', ...) - Use predict/ instead
# ❌ DO NOT ADD: path('ripeness/', ...) - Use predict/ instead
# ❌ DO NOT ADD: path('analyze/', ...) - Use predict/ instead 