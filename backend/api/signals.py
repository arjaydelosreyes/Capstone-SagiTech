from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import ScanRecord
 
@receiver(post_delete, sender=ScanRecord)
def delete_scan_image(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(False) 