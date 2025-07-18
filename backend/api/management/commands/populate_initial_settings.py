from django.core.management.base import BaseCommand
from api.models import SystemSetting
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Populate initial system settings for SagiTech'

    def handle(self, *args, **options):
        initial_settings = [
            {'key': 'site_name', 'value': 'SagiTech', 'category': 'system', 'data_type': 'string'},
            {'key': 'max_file_size', 'value': '10', 'category': 'system', 'data_type': 'integer'},
            {'key': 'maintenance_mode', 'value': 'false', 'category': 'system', 'data_type': 'boolean'},
            {'key': 'confidence_threshold', 'value': '0.8', 'category': 'ai', 'data_type': 'float'},
            {'key': 'model_version', 'value': 'v1.0.0', 'category': 'ai', 'data_type': 'string'},
            {'key': 'email_notifications', 'value': 'true', 'category': 'notifications', 'data_type': 'boolean'},
            {'key': 'audit_logging', 'value': 'true', 'category': 'security', 'data_type': 'boolean'},
        ]
        for setting in initial_settings:
            obj, created = SystemSetting.objects.get_or_create(
                key=setting['key'],
                defaults={
                    'value': setting['value'],
                    'category': setting['category'],
                    'data_type': setting['data_type'],
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created setting: {setting['key']}"))
            else:
                self.stdout.write(self.style.WARNING(f"Setting already exists: {setting['key']}")) 