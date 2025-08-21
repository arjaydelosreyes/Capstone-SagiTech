from django.shortcuts import render
from rest_framework import viewsets
from .models import Profile
from .serializers import ProfileSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics
from .serializers import RegisterSerializer, ScanRecordSerializer
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import ScanRecord
from rest_framework.views import APIView
from rest_framework import generics, permissions
from .models import SystemSetting
from .serializers import SystemSettingSerializer
from .permissions import IsAdminUserProfile
from .models import ActivityLog
from .serializers import ActivityLogSerializer
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from collections import Counter
from django.db.models import Sum, Avg, Count
import calendar

# Create your views here.

class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        profile = self.get_queryset().get(user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

class ScanRecordViewSet(viewsets.ModelViewSet):
    serializer_class = ScanRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ScanRecord.objects.filter(user=self.request.user).order_by('-timestamp')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    permission_classes = [IsAdminUserProfile]

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        categories = self.queryset.values_list('category', flat=True).distinct()
        data = {}
        for category in categories:
            settings = self.queryset.filter(category=category)
            data[category] = SystemSettingSerializer(settings, many=True).data
        return Response(data)

class ActivityLogViewSet(viewsets.ModelViewSet):
    queryset = ActivityLog.objects.all().order_by('-timestamp')
    serializer_class = ActivityLogSerializer

    @action(detail=False, methods=['get'])
    def recent(self, request):
        recent_activities = ActivityLog.objects.order_by('-timestamp')[:10]
        return Response(ActivityLogSerializer(recent_activities, many=True).data)

class DashboardOverviewView(APIView):
    def get(self, request):
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        total_users = User.objects.count()
        active_users = User.objects.filter(last_login__gte=week_ago).count()
        total_scans = ScanRecord.objects.count()
        # Calculate new scans this month
        new_this_month = ScanRecord.objects.filter(
            timestamp__year=now.year,
            timestamp__month=now.month
        ).count()
        # System uptime is static for now
        return Response({
            'totalUsers': total_users,
            'activeUsers': active_users,
            'totalScans': total_scans,
            'newThisMonth': new_this_month,
            'systemUptime': "99.9%"
        })

class AnalyticsOverviewView(APIView):
    permission_classes = [IsAdminUserProfile]

    def get(self, request):
        from .models import ScanRecord, Profile
        from django.contrib.auth.models import User
        from django.utils import timezone
        import calendar

        # Key Metrics
        total_scans = ScanRecord.objects.count()
        total_users = User.objects.count()
        total_bananas = ScanRecord.objects.aggregate(total=Sum('banana_count'))['total'] or 0
        avg_confidence = ScanRecord.objects.aggregate(avg=Avg('avg_confidence'))['avg'] or 0.0

        # Ripeness Distribution
        ripeness_counter = Counter()
        for scan in ScanRecord.objects.all():
            for result in scan.ripeness_results:
                ripeness = result.get('ripeness')
                if ripeness:
                    ripeness_counter[ripeness] += 1
        ripeness_distribution = dict(ripeness_counter)

        # User Growth (last 6 months)
        now = timezone.now()
        user_growth = []
        for i in range(5, -1, -1):
            month = (now.month - i - 1) % 12 + 1
            year = now.year if now.month - i > 0 else now.year - 1
            month_name = calendar.month_abbr[month]
            users_in_month = User.objects.filter(date_joined__year=year, date_joined__month=month).count()
            scans_in_month = ScanRecord.objects.filter(timestamp__year=year, timestamp__month=month).count()
            user_growth.append({
                'month': month_name,
                'users': users_in_month,
                'scans': scans_in_month
            })

        # Top Performers (top 5 by scan count)
        scan_counts = ScanRecord.objects.values('user').annotate(count=Count('id')).order_by('-count')[:5]
        top_performers = []
        for entry in scan_counts:
            user = User.objects.get(id=entry['user'])
            user_scans = ScanRecord.objects.filter(user=user)
            avg_accuracy = user_scans.aggregate(avg=Avg('avg_confidence'))['avg'] or 0.0
            top_performers.append({
                'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'email': user.email,
                'scans': entry['count'],
                'accuracy': round(avg_accuracy, 2)
            })

        return Response({
            'totalScans': total_scans,
            'totalUsers': total_users,
            'totalBananas': total_bananas,
            'avgConfidence': round(avg_confidence, 2),
            'ripenessDistribution': ripeness_distribution,
            'userGrowth': user_growth,
            'topPerformers': top_performers
        })


class HealthCheckView(APIView):
    """
    System health check endpoint
    """
    permission_classes = []  # Public endpoint

    def get(self, request):
        """Check system health status"""
        try:
            from django.db import connection
            from django.utils import timezone
            
            # Test database connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                db_healthy = True
        except Exception:
            db_healthy = False

        # Check ML service availability
        try:
            from ml.services.unified_ml_service import get_ml_service
            ml_service = get_ml_service()
            ml_healthy = True
        except Exception:
            ml_healthy = False

        overall_status = 'healthy' if (db_healthy and ml_healthy) else 'degraded'
        
        return Response({
            'status': overall_status,
            'timestamp': timezone.now().isoformat(),
            'version': '1.0.0',
            'components': {
                'database': 'healthy' if db_healthy else 'unhealthy',
                'ml_service': 'healthy' if ml_healthy else 'unhealthy'
            }
        })
