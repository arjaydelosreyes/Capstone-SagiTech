from rest_framework import routers
from .views import ProfileViewSet
from django.urls import path, include
from .views import RegisterView
from .authentication import EmailTokenObtainPairView
from rest_framework.routers import DefaultRouter
from .views import ScanRecordViewSet
from .views import SystemSettingViewSet
from .views import ActivityLogViewSet
from .views import DashboardOverviewView
from .views import AnalyticsOverviewView
from .views import BananaClassifyView

router = DefaultRouter()
router.register(r'profiles', ProfileViewSet)
router.register(r'scan-records', ScanRecordViewSet, basename='scanrecord')
router.register(r'settings', SystemSettingViewSet, basename='settings')
router.register(r'activity', ActivityLogViewSet, basename='activity')

urlpatterns = router.urls

urlpatterns += [
    path('register/', RegisterView.as_view(), name='register'),
]

urlpatterns += [
    path('token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
]

urlpatterns += [
    path('dashboard/overview/', DashboardOverviewView.as_view(), name='dashboard-overview'),
]

urlpatterns += [
    path('analytics/overview/', AnalyticsOverviewView.as_view(), name='analytics-overview'),
]

urlpatterns += [
    path('bananas/classify/', BananaClassifyView.as_view(), name='bananas-classify'),
] 