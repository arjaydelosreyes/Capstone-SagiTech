# Yield Prediction Integration Guide

This guide explains how to fully integrate the yield prediction model with the Django backend and expose it via an API endpoint.

---

## 1. Folder Structure

```
backend/
  ml/
    yield_prediction/
      model/           # Place your trained yield prediction model here (e.g., yield_model.pkl)
      inference.py     # Inference logic (edit this file)
      INTEGRATION_GUIDE.md  # This guide
      README.md        # ML team instructions
```

---

## 2. Model Placement
- After training, place your yield prediction model (e.g., `yield_model.pkl`) in `backend/ml/yield_prediction/model/`.

---

## 3. Update Inference Script
- Edit `inference.py` to load your model and implement the `predict(features)` method.
- The method should return a dictionary with:
  - `predicted_yield`: float (e.g., 1234.56)
  - `unit`: string (e.g., "kg/ha")

---

## 4. Add Django API Endpoint

**Example (in `api/views.py`):**
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from ml.yield_prediction.inference import YieldPredictor

class YieldPredictionView(APIView):
    def post(self, request):
        features = request.data  # Expecting a JSON with features
        predictor = YieldPredictor()
        result = predictor.predict(features)
        return Response(result)
```

**Add to `api/urls.py`:**
```python
from .views import YieldPredictionView
urlpatterns += [
    path('yield-prediction/', YieldPredictionView.as_view(), name='yield_prediction'),
]
```

---

## 5. Example API Request

**POST** `/api/yield-prediction/`
- Content-Type: `application/json`
- Body: `{ "feature1": 1.0, "feature2": 2.0, ... }`

**Example Response:**
```json
{
  "predicted_yield": 1234.56,
  "unit": "kg/ha"
}
```

---

## 6. Tips
- Ensure the model and all dependencies are installed in your backend environment.
- Protect the endpoint with authentication if needed.
- Validate input features for completeness and correctness.

---

**This guide ensures that anyone on your team can integrate, update, or debug the yield prediction ML pipeline with the backend and API.** 