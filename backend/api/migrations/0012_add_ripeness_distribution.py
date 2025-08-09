# Generated manually for ripeness distribution fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_merge_20250808_2334'),
    ]

    operations = [
        migrations.AddField(
            model_name='scanrecord',
            name='not_mature_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='scanrecord',
            name='mature_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='scanrecord',
            name='ripe_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='scanrecord',
            name='over_ripe_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='scanrecord',
            name='overall_ripeness',
            field=models.CharField(default='', max_length=20),
        ),
        migrations.AddField(
            model_name='scanrecord',
            name='ripeness_distribution',
            field=models.JSONField(default=dict),
        ),
    ]