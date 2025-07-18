from django.contrib import admin
from .models import Profile, ScanRecord, SystemSetting, ActivityLog

admin.site.register(Profile)
admin.site.register(ScanRecord)
admin.site.register(SystemSetting)
admin.site.register(ActivityLog)
