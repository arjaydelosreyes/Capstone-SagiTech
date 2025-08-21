"""
Management command to generate performance reports
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import json
from api.utils.monitoring import PerformanceMonitor


class Command(BaseCommand):
    help = 'Generate performance report for SagiTech system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to include in report (default: 7)'
        )
        parser.add_argument(
            '--output',
            type=str,
            help='Output file path (optional)'
        )

    def handle(self, *args, **options):
        days = options['days']
        output_file = options.get('output')
        
        self.stdout.write(f"Generating performance report for last {days} days...")
        
        try:
            # Get system health
            health_metrics = PerformanceMonitor.get_system_health()
            
            # Get model performance
            model_metrics = PerformanceMonitor.get_model_performance()
            
            # Combine reports
            report = {
                'report_generated': timezone.now().isoformat(),
                'period_days': days,
                'system_health': health_metrics,
                'model_performance': model_metrics
            }
            
            # Output report
            if output_file:
                with open(output_file, 'w') as f:
                    json.dump(report, f, indent=2)
                self.stdout.write(f"Report saved to: {output_file}")
            else:
                self.stdout.write(json.dumps(report, indent=2))
            
            # Summary
            self.stdout.write(self.style.SUCCESS("Performance Report Summary:"))
            self.stdout.write(f"System Status: {health_metrics.get('system_status', 'unknown')}")
            self.stdout.write(f"Total Scans: {health_metrics.get('total_scans', 0)}")
            self.stdout.write(f"Error Rate (24h): {health_metrics.get('error_rate_24h', 0)}%")
            self.stdout.write(f"Avg Processing Time: {health_metrics.get('avg_processing_time', 0)}s")
            self.stdout.write(f"Avg Confidence: {health_metrics.get('avg_confidence', 0)}%")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to generate report: {e}"))