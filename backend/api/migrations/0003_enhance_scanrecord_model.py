# Generated migration for enhanced ScanRecord model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_remove_phone_number_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='scanrecord',
            name='analysis_mode',
            field=models.CharField(
                choices=[('fast', 'Fast'), ('standard', 'Standard'), ('high_recall', 'High Recall')],
                default='standard',
                help_text='Analysis mode used for detection',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='scanrecord',
            name='confidence_threshold',
            field=models.FloatField(default=0.5, help_text='Confidence threshold used'),
        ),
        migrations.AddField(
            model_name='scanrecord',
            name='error_message',
            field=models.TextField(blank=True, help_text='Error message if analysis failed', null=True),
        ),
        migrations.AddField(
            model_name='scanrecord',
            name='has_segmentation',
            field=models.BooleanField(default=False, help_text='Whether segmentation data is available'),
        ),
        migrations.AddField(
            model_name='scanrecord',
            name='image_metadata',
            field=models.JSONField(default=dict, help_text='Original image metadata (size, format, etc.)'),
        ),
        migrations.AddField(
            model_name='scanrecord',
            name='model_version',
            field=models.CharField(default='unknown', help_text='ML model version used', max_length=50),
        ),
        migrations.AddField(
            model_name='scanrecord',
            name='processing_time',
            field=models.FloatField(default=0.0, help_text='Processing time in seconds'),
        ),
        migrations.AddField(
            model_name='scanrecord',
            name='quality_score',
            field=models.FloatField(blank=True, help_text='Overall quality score of the analysis', null=True),
        ),
        migrations.AddField(
            model_name='scanrecord',
            name='retry_count',
            field=models.IntegerField(default=0, help_text='Number of retry attempts'),
        ),
        migrations.AlterField(
            model_name='scanrecord',
            name='avg_confidence',
            field=models.FloatField(default=0.0, help_text='Average confidence across all detections'),
        ),
        migrations.AlterField(
            model_name='scanrecord',
            name='banana_count',
            field=models.IntegerField(default=0, help_text='Total number of bananas detected'),
        ),
        migrations.AlterField(
            model_name='scanrecord',
            name='ripeness_results',
            field=models.JSONField(default=list, help_text='List of {ripeness, confidence, bbox, centroid, area, quality_score}'),
        ),
        migrations.AddIndex(
            model_name='scanrecord',
            index=models.Index(fields=['user', '-timestamp'], name='api_scanrecord_user_timestamp_idx'),
        ),
        migrations.AddIndex(
            model_name='scanrecord',
            index=models.Index(fields=['timestamp'], name='api_scanrecord_timestamp_idx'),
        ),
        migrations.AddIndex(
            model_name='scanrecord',
            index=models.Index(fields=['banana_count'], name='api_scanrecord_banana_count_idx'),
        ),
    ]