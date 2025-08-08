# SagiTech Production Deployment Guide

## System Overview

SagiTech is a production-grade banana ripeness classification system built with:

- **Backend**: Django REST Framework with advanced ML pipeline
- **ML Model**: YOLOv8 with polygon segmentation for 4-class ripeness detection
- **Frontend**: React/TypeScript with advanced visualization
- **Database**: Enhanced schema with performance monitoring
- **Architecture**: Industrial MLOps standards with comprehensive monitoring

## Production Features Implemented

### 🧠 Advanced ML Infrastructure

#### YOLOv8 Integration
- Production-grade YOLOv8 model with polygon segmentation
- 4-class ripeness detection: Not Mature, Mature, Ripe, Over Ripe
- Real-time inference with optimized preprocessing pipeline
- Comprehensive quality validation and scoring

#### Data Structures
```python
# Enhanced ScanRecord model with ML metrics
class ScanRecord(models.Model):
    # Basic fields
    user = models.ForeignKey(User)
    image = models.ImageField()
    timestamp = models.DateTimeField()
    
    # ML Results
    detections_data = models.JSONField()  # Full detection objects
    quality_metrics = models.JSONField()  # Performance metrics
    overall_quality_score = models.FloatField()
    processing_time = models.FloatField()
    model_version = models.CharField()
    
    # Ripeness counts for fast querying
    not_mature_count = models.IntegerField()
    mature_count = models.IntegerField()
    ripe_count = models.IntegerField()
    over_ripe_count = models.IntegerField()
```

### 🚀 API Endpoints

#### ML Analysis Endpoints
- `POST /api/ml/analyze/` - Single image analysis with full configuration
- `POST /api/ml/bulk-analyze/` - Batch processing for multiple images
- `GET /api/ml/performance/` - Model performance monitoring and metrics

#### Enhanced Configuration
```typescript
interface AnalysisConfig {
  confidence_threshold?: number;  // 0.1 - 1.0
  iou_threshold?: number;        // 0.1 - 1.0  
  return_visualization?: boolean; // Generate overlay images
  save_results?: boolean;        // Save to database
}
```

### 📊 Performance Monitoring

#### Real-time Metrics
- Inference time tracking
- Quality score distribution
- Model drift detection
- Error rate monitoring
- Resource utilization (CPU/GPU/Memory)

#### Quality Assurance
- Multi-layered validation pipeline
- Geometric polygon validation
- Confidence threshold enforcement
- Anomaly detection and alerting

### 🎯 Frontend Enhancements

#### Advanced Visualization
- Real-time polygon overlay rendering
- Server-side visualization generation
- Interactive detection details
- Quality grade visualization (A+ to D grading)

#### Production UI Features
- Advanced analysis settings panel
- Real-time processing feedback
- Comprehensive result breakdown
- Performance metrics display

## Deployment Instructions

### 1. System Requirements

#### Minimum Hardware
- **CPU**: 4+ cores, 2.4GHz+
- **RAM**: 8GB+ (16GB recommended)
- **Storage**: 50GB+ SSD
- **GPU**: Optional but recommended (NVIDIA RTX 3060+ or equivalent)

#### Software Requirements
- Python 3.9+
- Node.js 18+
- CUDA 11.8+ (for GPU acceleration)

### 2. Backend Setup

```bash
# Clone and setup backend
cd backend/

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Setup database
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Add YOLOv8 model file
# Place your trained model at: ml/models/banana_detection/best.pt

# Start development server
python manage.py runserver
```

### 3. Frontend Setup

```bash
# Setup frontend
cd frontend/

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### 4. Model Deployment

#### YOLOv8 Model Setup
1. Train your YOLOv8 model with Roboflow data
2. Export to `.pt` format
3. Place at `backend/ml/models/banana_detection/best.pt`
4. Verify model loads correctly:

```python
from backend.ml.banana_detection.inference import BananaDetector

detector = BananaDetector()
print(f"Model loaded: {detector.model_manager.is_loaded}")
print(f"Classes: {detector.model_manager.model.names}")
```

### 5. Production Configuration

#### Environment Variables
```bash
# Create .env file in backend/
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=your-domain.com,localhost

# Database (PostgreSQL recommended for production)
DATABASE_URL=postgresql://user:password@localhost:5432/sagitech

# ML Configuration
ML_MODEL_PATH=ml/models/banana_detection/best.pt
CONFIDENCE_THRESHOLD=0.75
ENABLE_GPU=True

# Monitoring
PROMETHEUS_ENABLED=True
LOG_LEVEL=INFO
```

### 6. Production Deployment

#### Using Docker
```dockerfile
# Dockerfile example
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000"]
```

#### Using Nginx + Gunicorn
```nginx
# nginx configuration
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 50M;  # For large image uploads
    }

    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

## API Usage Examples

### Single Image Analysis
```typescript
import { AdvancedBananaAnalyzer } from './utils/advancedAnalyzeBanana';

const result = await AdvancedBananaAnalyzer.analyzeImage(imageFile, {
  confidence_threshold: 0.8,
  return_visualization: true,
  save_results: true
});

console.log(`Found ${result.banana_count} bananas`);
console.log(`Quality: ${result.overall_quality_score}`);
```

### Bulk Processing
```typescript
const results = await AdvancedBananaAnalyzer.analyzeBulk(imageFiles, {
  confidence_threshold: 0.75,
  save_results: true
});

console.log(`Processed ${results.successful_analyses}/${results.total_images} images`);
```

### Performance Monitoring
```typescript
const stats = await AdvancedBananaAnalyzer.getPerformanceStats('day');
console.log(`Average inference time: ${stats.metrics.avg_inference_time}s`);
console.log(`Model accuracy: ${stats.metrics.avg_confidence}`);
```

## Monitoring and Maintenance

### Health Checks
- Model loading status
- Database connectivity
- API response times
- Error rates and patterns

### Performance Metrics
- Inference latency (target: <2 seconds)
- Throughput (target: >100 images/minute)
- Accuracy metrics (target: >95%)
- Resource utilization

### Alerting
- Quality degradation alerts
- Performance threshold breaches
- System resource alerts
- Model drift detection

## Troubleshooting

### Common Issues

#### Model Loading Errors
```bash
# Check model file exists
ls -la ml/models/banana_detection/best.pt

# Verify CUDA availability
python -c "import torch; print(torch.cuda.is_available())"

# Test model loading
python manage.py shell
>>> from ml.banana_detection.inference import get_detector
>>> detector = get_detector()
```

#### Memory Issues
- Reduce batch size for bulk processing
- Enable GPU acceleration if available
- Monitor memory usage with htop/nvidia-smi

#### Performance Issues
- Enable model caching
- Optimize image preprocessing
- Use GPU acceleration
- Implement Redis caching

## Security Considerations

- File upload validation and size limits
- Rate limiting for API endpoints
- Authentication and authorization
- Input sanitization and validation
- Regular security updates

## Maintenance Schedule

### Daily
- Monitor system health and alerts
- Check error logs and performance metrics
- Verify model accuracy metrics

### Weekly
- Review performance trends
- Update dependencies if needed
- Backup database and model files

### Monthly
- Analyze model drift metrics
- Performance optimization review
- Security audit and updates

## Support and Documentation

- **API Documentation**: Available at `/api/docs/`
- **Model Documentation**: See `ml/README.md`
- **Performance Monitoring**: Access at `/monitoring/`
- **Database Schema**: See `DATABASE_SCHEMA.md`

## Success Metrics

### Technical KPIs
- **Accuracy**: >95% overall detection accuracy
- **Performance**: <2s inference time, >99.9% uptime
- **Quality**: >90% confidence on valid detections
- **Scalability**: Handle 1000+ requests/hour

### Business KPIs
- **User Adoption**: Active farmer engagement
- **Data Quality**: Consistent, reliable classifications
- **System Reliability**: Minimal downtime and errors
- **Processing Efficiency**: Fast, accurate results

This production deployment guide ensures SagiTech meets enterprise standards for reliability, scalability, and maintainability while delivering state-of-the-art banana ripeness classification capabilities.