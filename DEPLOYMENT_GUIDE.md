# SagiTech Deployment Guide

## Production Deployment Checklist

### Pre-Deployment Security
- [ ] Change Django SECRET_KEY
- [ ] Set DEBUG = False
- [ ] Configure ALLOWED_HOSTS
- [ ] Set up environment variables
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable security headers

### Database Setup
- [ ] Create production database
- [ ] Run migrations: `python manage.py migrate`
- [ ] Create superuser: `python manage.py createsuperuser`
- [ ] Set up database backups
- [ ] Configure connection pooling

### File Storage
- [ ] Configure AWS S3 or similar
- [ ] Set up media file serving
- [ ] Enable image optimization
- [ ] Configure CDN (optional)

### ML Model Deployment
- [ ] Upload trained YOLOv8 model
- [ ] Configure model paths
- [ ] Test model loading
- [ ] Set up model versioning
- [ ] Configure Roboflow API keys

### Monitoring Setup
- [ ] Configure logging
- [ ] Set up error tracking (Sentry)
- [ ] Enable performance monitoring
- [ ] Configure health checks
- [ ] Set up alerts

### Performance Optimization
- [ ] Enable caching (Redis)
- [ ] Configure CDN
- [ ] Optimize database queries
- [ ] Enable compression
- [ ] Set up load balancing

## Environment Variables

### Required Environment Variables
```bash
# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@localhost:5432/sagitech

# ML/AI
ROBOFLOW_API_KEY=your-roboflow-api-key
ROBOFLOW_MODEL_ID=your-model-id
ROBOFLOW_VERSION=1

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=sagitech-media
AWS_S3_REGION_NAME=us-east-1

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@yourdomain.com

# Redis (Caching)
REDIS_URL=redis://localhost:6379/0

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

## Docker Deployment

### Dockerfile (Backend)
```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create logs directory
RUN mkdir -p logs

# Collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "backend.wsgi:application"]
```

### Dockerfile (Frontend)
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Serve with nginx
FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: sagitech
      POSTGRES_USER: sagitech
      POSTGRES_PASSWORD: your-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://sagitech:your-password@db:5432/sagitech
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    ports:
      - "8000:8000"
    volumes:
      - media_files:/app/media

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
  media_files:
```

## Performance Tuning

### Database Optimization
```python
# settings.py additions
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'sagitech',
        'USER': 'sagitech',
        'PASSWORD': 'your-password',
        'HOST': 'localhost',
        'PORT': '5432',
        'OPTIONS': {
            'MAX_CONNS': 20,
            'CONN_MAX_AGE': 60,
        }
    }
}

# Index optimization
class Meta:
    indexes = [
        models.Index(fields=['user', '-timestamp']),
        models.Index(fields=['banana_count']),
        models.Index(fields=['avg_confidence']),
    ]
```

### Caching Strategy
```python
# Redis caching
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Cache usage
from django.core.cache import cache

# Cache expensive calculations
cache.set('user_analytics_123', analytics_data, 300)  # 5 minutes
```

## Monitoring Setup

### Health Check Endpoint
```python
# urls.py
path('health/', HealthCheckView.as_view(), name='health-check'),

# views.py
class HealthCheckView(APIView):
    permission_classes = []
    
    def get(self, request):
        return Response({
            'status': 'healthy',
            'timestamp': timezone.now(),
            'version': '1.0.0'
        })
```

### Logging Configuration
```python
# Production logging
LOGGING = {
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/sagitech/app.log',
            'maxBytes': 50 * 1024 * 1024,  # 50MB
            'backupCount': 10,
        }
    }
}
```

## Backup Strategy

### Database Backups
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump sagitech > /backups/sagitech_$DATE.sql
find /backups -name "sagitech_*.sql" -mtime +7 -delete
```

### Media File Backups
```bash
# Sync media files to S3
aws s3 sync /app/media s3://sagitech-backups/media/
```

## SSL/HTTPS Setup

### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /media/ {
        alias /app/media/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Maintenance

### Regular Tasks
- [ ] Monitor error rates
- [ ] Review performance metrics
- [ ] Update dependencies
- [ ] Backup verification
- [ ] Security updates
- [ ] Model retraining (monthly)

### Monitoring Commands
```bash
# Check system status
python manage.py generate_performance_report

# Monitor real-time logs
tail -f logs/api.log | grep ERROR

# Check disk usage
df -h

# Monitor memory usage
free -h
```

## Rollback Procedures

### Application Rollback
1. Stop application services
2. Restore previous code version
3. Rollback database migrations if needed
4. Restart services
5. Verify functionality

### Database Rollback
```bash
# Restore from backup
psql sagitech < /backups/sagitech_backup.sql
```

## Support & Maintenance

### Log Locations
- Application logs: `/var/log/sagitech/app.log`
- Error logs: `/var/log/sagitech/errors.log`
- API logs: `/var/log/sagitech/api.log`
- Nginx logs: `/var/log/nginx/`

### Key Metrics to Monitor
- Response time < 3 seconds
- Error rate < 5%
- ML model accuracy > 85%
- Database response time < 100ms
- Memory usage < 80%
- Disk usage < 85%