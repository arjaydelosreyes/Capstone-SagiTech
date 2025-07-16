from rest_framework import routers
from .views import ProfileViewSet
from django.urls import path, include
from .views import RegisterView
from .authentication import EmailTokenObtainPairView
from rest_framework.routers import DefaultRouter
from .views import ScanRecordViewSet

router = DefaultRouter()
router.register(r'profiles', ProfileViewSet)
router.register(r'scan-records', ScanRecordViewSet, basename='scanrecord')

urlpatterns = [
    path('', include(router.urls)),
]

urlpatterns += [
    path('register/', RegisterView.as_view(), name='register'),
]

urlpatterns += [
    path('token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
] 