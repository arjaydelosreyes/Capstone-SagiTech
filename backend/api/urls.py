from django.urls import path, include
from . import views
from .views import RegisterView, DashboardOverviewView, AnalyticsOverviewView
from .authentication import EmailTokenObtainPairView
from rest_framework.routers import DefaultRouter
from .views import (
    ScanRecordViewSet, SystemSettingViewSet, ActivityLogViewSet, QualityAlertViewSet,
    MLAnalysisView, BulkAnalysisView, ModelPerformanceView
)

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'profiles', views.ProfileViewSet)
router.register(r'scan-records', ScanRecordViewSet, basename='scanrecord')
router.register(r'settings', SystemSettingViewSet, basename='settings')
router.register(r'activity', ActivityLogViewSet, basename='activity')
router.register(r'quality-alerts', QualityAlertViewSet, basename='qualityalert')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', EmailTokenObtainPairView.as_view(), name='login'),
    path('dashboard/', DashboardOverviewView.as_view(), name='dashboard'),
    path('analytics/', AnalyticsOverviewView.as_view(), name='analytics'),
    
    # ML Analysis Endpoints
    path('ml/analyze/', MLAnalysisView.as_view(), name='ml-analyze'),
    path('ml/bulk-analyze/', BulkAnalysisView.as_view(), name='ml-bulk-analyze'),
    path('ml/performance/', ModelPerformanceView.as_view(), name='ml-performance'),
    
    # API documentation endpoints
    path('ml/model-info/', views.ModelPerformanceView.as_view(), name='ml-model-info'),
] 