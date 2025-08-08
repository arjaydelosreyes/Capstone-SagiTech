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

from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status

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


class BananaClassifyView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get('image') or request.FILES.get('file')
        if not file_obj:
            return Response({"detail": "No image provided. Use 'image' or 'file' field."}, status=status.HTTP_400_BAD_REQUEST)

        image_bytes = file_obj.read()
        # Lazy imports to avoid import-time dependency errors
        from ml.banana_detection.inference import get_banana_detector
        import numpy as np

        detector = get_banana_detector()
        results = detector.predict_from_bytes(image_bytes)

        # Convert results to API/storage schema
        ripeness_results = []
        for r in results:
            ripeness_results.append({
                'ripeness': r.get('category'),  # alias for compatibility
                'category': r.get('category'),
                'confidence': r.get('confidence'),
                'bbox': r.get('bbox'),
                'polygon': r.get('polygon'),
                'area': r.get('area'),
                'timestamp': r.get('timestamp'),
            })

        counts = detector.count_by_category(results)
        banana_count = int(sum(counts.values()))
        avg_confidence = float(np.mean([r.get('confidence', 0.0) for r in results])) if results else 0.0

        # Reset file pointer before saving since we consumed it with read()
        try:
            file_obj.seek(0)
        except Exception:
            pass

        # Persist ScanRecord
        scan = ScanRecord(
            user=request.user,
            image=file_obj,
            banana_count=banana_count,
            ripeness_results=ripeness_results,
            avg_confidence=avg_confidence,
        )
        scan.save()

        return Response({
            'banana_count': banana_count,
            'counts': counts,
            'avg_confidence': round(avg_confidence, 4),
            'results': ripeness_results,
            'scan_id': scan.id,
            'timestamp': scan.timestamp,
        }, status=status.HTTP_200_OK)
