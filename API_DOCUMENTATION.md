# SagiTech API Documentation

## Overview
SagiTech provides a RESTful API for banana ripeness detection and yield prediction using AI/ML models.

**Base URL**: `http://localhost:8000/api`

**Authentication**: JWT Bearer Token

## Single Endpoint Architecture

### Core Principle: ONE FUNCTION = ONE ENDPOINT

This API follows a strict single endpoint architecture where each functional operation has exactly one endpoint.

## Authentication

### Login
```http
POST /api/token/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### Register
```http
POST /api/register/
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com", 
  "password": "securepass123"
}
```

## Core ML Endpoints

### 1. Complete Prediction Pipeline (SINGLE ENDPOINT)
```http
POST /api/predict/
Authorization: Bearer <token>
Content-Type: multipart/form-data

image: <file>
mode: "standard" | "fast" | "high_recall" (optional, default: "standard")
```

**Response:**
```json
{
  "id": 123,
  "image_url": "http://localhost:8000/media/scans/scan_20241208_123456_abc123.jpg",
  "total_count": 5,
  "ripeness_distribution": {
    "not_mature": 1,
    "mature": 2,
    "ripe": 2,
    "over_ripe": 0
  },
  "confidence": 87.5,
  "bounding_boxes": [
    {
      "bbox": [100, 150, 200, 250],
      "ripeness": "mature",
      "confidence": 0.92,
      "centroid": [150, 200],
      "area": 10000,
      "quality_score": 0.88
    }
  ],
  "processed_at": "2024-12-08T12:34:56Z",
  "processing_metadata": {
    "model_version": "yolov8-saba-v1.2",
    "processing_time": 2.347,
    "analysis_mode": "standard",
    "confidence_threshold": 0.5,
    "has_segmentation": true
  }
}
```

**Error Response:**
```json
{
  "error": "AI analysis failed",
  "details": "The banana detection model encountered an error.",
  "technical_details": "Model loading failed: CUDA out of memory",
  "scan_id": 123,
  "retry_count": 1,
  "timestamp": "2024-12-08T12:34:56Z"
}
```

### 2. Get Specific Prediction (SINGLE ENDPOINT)
```http
GET /api/prediction/{id}/
Authorization: Bearer <token>
```

**Response:** Same format as prediction endpoint

### 3. List Predictions (SINGLE ENDPOINT)
```http
GET /api/predictions/?page=1&page_size=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "results": [
    {
      "id": 123,
      "user": {
        "id": 1,
        "username": "farmer1",
        "email": "farmer@example.com",
        "first_name": "John",
        "last_name": "Doe"
      },
      "image_url": "http://localhost:8000/media/scans/scan_123.jpg",
      "timestamp": "2024-12-08T12:34:56Z",
      "banana_count": 5,
      "ripeness_results": [...],
      "avg_confidence": 87.5,
      "ripeness": "Mature",
      "ripeness_distribution": {...},
      "analysis_mode": "standard",
      "processing_time": 2.347,
      "model_version": "yolov8-saba-v1.2",
      "quality_score": 0.88,
      "success_rate": 92.5
    }
  ],
  "count": 150,
  "next": "?page=2",
  "previous": null,
  "page": 1,
  "page_size": 20
}
```

### 4. User Analytics (SINGLE ENDPOINT)
```http
GET /api/analytics/
Authorization: Bearer <token>
```

**Response:**
```json
{
  "totalScans": 45,
  "totalBananas": 234,
  "avgConfidence": 87.2,
  "ripenessDistribution": {
    "not_mature": 23,
    "mature": 145,
    "ripe": 56,
    "over_ripe": 10
  },
  "scanHistory": [...],
  "lastScanDate": "2024-12-08T12:34:56Z"
}
```

## Admin Endpoints

### Dashboard Overview
```http
GET /api/dashboard/overview/
Authorization: Bearer <admin-token>
```

### System Analytics
```http
GET /api/analytics/overview/
Authorization: Bearer <admin-token>
```

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Short error description",
  "details": "User-friendly error message",
  "technical_details": "Technical details (development only)",
  "timestamp": "2024-12-08T12:34:56Z"
}
```

### HTTP Status Codes

- `200 OK` - Success
- `400 Bad Request` - Invalid input (file format, size, missing fields)
- `401 Unauthorized` - Authentication required or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server/ML model error

## Rate Limits

- **Prediction endpoint**: 10 requests/minute per IP
- **General API**: 100 requests/minute per IP

## File Upload Constraints

- **Maximum size**: 10MB
- **Supported formats**: JPEG, PNG, WebP
- **Minimum dimensions**: 100x100 pixels
- **Maximum dimensions**: 4096x4096 pixels

## Analysis Modes

1. **fast**: Optimized for speed, higher confidence threshold
2. **standard**: Balanced accuracy and speed (default)
3. **high_recall**: Maximum detection sensitivity, lower confidence threshold

## Data Models

### BananaDetection
```typescript
interface BananaDetection {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  ripeness: "Not Mature" | "Mature" | "Ripe" | "Over Ripe";
  confidence: number; // 0.0 - 1.0
  centroid: [number, number]; // [x, y]
  area: number; // pixels
  quality_score: number; // 0.0 - 1.0
}
```

### RipenessDistribution
```typescript
interface RipenessDistribution {
  not_mature: number;
  mature: number;
  ripe: number;
  over_ripe: number;
}
```

## Security Features

- JWT authentication with refresh tokens
- Rate limiting per IP address
- File type validation and security scanning
- Input sanitization
- CORS protection
- Security headers (XSS, CSRF, etc.)

## Performance Features

- Image optimization and resizing
- Response caching
- Database query optimization
- Request timing monitoring
- Slow request detection

## Monitoring & Logging

- Structured logging with rotation
- Performance metrics tracking
- Error rate monitoring
- User activity logging
- System health checks

## Integration Examples

### JavaScript/React
```javascript
import { apiService } from './services/ApiService';

// Predict banana ripeness
const file = document.getElementById('imageInput').files[0];
try {
  const result = await apiService.predict(file, 'standard');
  console.log(`Found ${result.total_count} bananas`);
} catch (error) {
  console.error('Prediction failed:', error);
}

// Get prediction history
const history = await apiService.listPredictions(1);
console.log(`Total predictions: ${history.count}`);
```

### Python
```python
import requests

# Login
login_response = requests.post('http://localhost:8000/api/token/', {
    'email': 'user@example.com',
    'password': 'password123'
})
token = login_response.json()['access']

# Predict
with open('banana_image.jpg', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/predict/',
        files={'image': f},
        data={'mode': 'standard'},
        headers={'Authorization': f'Bearer {token}'}
    )
    
result = response.json()
print(f"Detected {result['total_count']} bananas")
```

## Deprecated Endpoints

❌ **DO NOT USE** - These violate single endpoint architecture:
- `/api/upload/` - Use `/api/predict/` instead
- `/api/process/` - Use `/api/predict/` instead  
- `/api/roboflow/` - Use `/api/predict/` instead
- `/api/count/` - Use `/api/predict/` instead
- `/api/ripeness/` - Use `/api/predict/` instead
- `/api/analyze/` - Use `/api/predict/` instead

## Support

For technical support or API questions, please refer to the system logs or contact the development team.