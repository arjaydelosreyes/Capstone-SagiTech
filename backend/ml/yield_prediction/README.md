# Yield Prediction

## Model Placement
- Place your trained yield prediction model (e.g., `yield_model.pkl`) in the `model/` folder.

## Inference Script
- Update `inference.py` to load your model and run predictions.
- The `predict(features)` method should return the predicted yield and unit.

## Example Usage
```python
from inference import YieldPredictor

predictor = YieldPredictor()
results = predictor.predict({'feature1': 1.0, 'feature2': 2.0})
print(results)
``` 