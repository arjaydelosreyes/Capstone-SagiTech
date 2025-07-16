# Banana Detection & Ripeness (YOLOv8)

## Model Placement
- Place your trained YOLOv8 weights (e.g., `best.pt`) in the `model/` folder.

## Inference Script
- Update `inference.py` to load your model and run predictions.
- The `predict(image_path)` method should return a list of detections, each with bounding box, ripeness label, and confidence.

## Example Usage
```python
from inference import BananaDetector

detector = BananaDetector()
results = detector.predict('path/to/image.jpg')
print(results)
``` 