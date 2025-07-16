# Banana Detection & Ripeness Integration Guide

This guide explains how to fully integrate the banana detection and ripeness classification model (YOLOv8) with the Django backend and expose it via an API endpoint.

---

## 1. Folder Structure

```
backend/
  ml/
    banana_detection/
      model/           # Place YOLOv8 weights here (e.g., best.pt)
      inference.py     # Inference logic (edit this file)
      INTEGRATION_GUIDE.md  # This guide
      README.md        # ML team instructions
```

---

## 2. Model Placement
- After training, place your YOLOv8 weights (e.g., `best.pt`) in `backend/ml/banana_detection/model/`.

---

## 3. Update Inference Script
- Edit `inference.py` to load your YOLOv8 model and implement the `predict(image_path)` method.
- The method should return a list of detections, each with:
  - `bbox`: [x1, y1, x2, y2]
  - `ripeness`: class label (e.g., "ripe", "unripe")
  - `confidence`: float (0-1)

---

## 4. Add Django API Endpoint

**Example (in `api/views.py`):**
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from ml.banana_detection.inference import BananaDetector
import tempfile

class BananaDetectionView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        image = request.FILES['image']
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp:
            for chunk in image.chunks():
                temp.write(chunk)
            temp_path = temp.name
        detector = BananaDetector()
        result = detector.predict(temp_path)
        return Response(result)
```

**Add to `api/urls.py`:**
```python
from .views import BananaDetectionView
urlpatterns += [
    path('banana-detect/', BananaDetectionView.as_view(), name='banana_detect'),
]
```

---

## 5. Example API Request

**POST** `/api/banana-detect/`
- Content-Type: `multipart/form-data`
- Body: `image` (file)

**Example Response:**
```json
[
  { "bbox": [100, 100, 200, 200], "ripeness": "ripe", "confidence": 0.98 },
  { "bbox": [220, 120, 300, 210], "ripeness": "unripe", "confidence": 0.95 }
]
```

---

## 6. Tips
- Ensure the model and all dependencies are installed in your backend environment.
- Protect the endpoint with authentication if needed.
- Clean up temporary files after inference if required.

---

**This guide ensures that anyone on your team can integrate, update, or debug the banana detection ML pipeline with the backend and API.** 