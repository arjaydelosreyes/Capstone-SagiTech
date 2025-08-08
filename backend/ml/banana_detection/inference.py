"""
SagiTech Production-Grade Banana Detection and Ripeness Classification System
Using YOLOv8 with polygon segmentation for industrial-quality inference
"""

import cv2
import numpy as np
import torch
from ultralytics import YOLO
import logging
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime
import time
import json
import traceback
from pathlib import Path
import hashlib
from contextlib import contextmanager
import albumentations as A
from PIL import Image, ImageDraw
import io
import base64

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class BananaDetection:
    """Structured output for individual banana detection"""
    class_id: int
    class_name: str
    confidence: float
    polygon: List[Tuple[float, float]]
    bbox: Tuple[float, float, float, float]  # x1, y1, x2, y2
    area: float
    quality_score: float
    timestamp: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)

@dataclass
class AnalysisResult:
    """Complete analysis result structure"""
    success: bool
    detections: List[BananaDetection]
    processing_time: float
    model_version: str
    quality_metrics: Dict[str, float]
    metadata: Dict[str, Any]
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = asdict(self)
        result['detections'] = [det.to_dict() for det in self.detections]
        return result

class QualityValidator:
    """Production-grade quality validation system"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.quality_thresholds = config.get('quality_thresholds', {})
        
    def validate_detection_quality(self, detection: BananaDetection) -> Tuple[bool, List[str]]:
        """Comprehensive quality validation with detailed feedback"""
        issues = []
        
        # Confidence threshold check
        min_confidence = self.quality_thresholds.get('min_confidence', 0.75)
        if detection.confidence < min_confidence:
            issues.append(f"Low confidence: {detection.confidence:.2f} < {min_confidence}")
        
        # Polygon geometry validation
        if len(detection.polygon) < 3:
            issues.append("Invalid polygon: Less than 3 vertices")
        
        # Area validation
        min_area = self.quality_thresholds.get('min_polygon_area', 100)
        if detection.area < min_area:
            issues.append(f"Small detection area: {detection.area:.1f} < {min_area}")
        
        # Aspect ratio validation
        bbox = detection.bbox
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        aspect_ratio = width / height if height > 0 else 0
        max_aspect_ratio = self.quality_thresholds.get('max_aspect_ratio', 5.0)
        
        if aspect_ratio > max_aspect_ratio:
            issues.append(f"Extreme aspect ratio: {aspect_ratio:.2f} > {max_aspect_ratio}")
        
        return len(issues) == 0, issues
    
    def calculate_quality_score(self, detection: BananaDetection) -> float:
        """Calculate overall quality score (0-1)"""
        scores = []
        
        # Confidence score (normalized)
        confidence_score = min(detection.confidence, 1.0)
        scores.append(confidence_score)
        
        # Area score (normalized by image area)
        area_score = min(detection.area / 10000, 1.0)  # Normalize by reasonable max area
        scores.append(area_score)
        
        # Polygon complexity score
        polygon_score = min(len(detection.polygon) / 8, 1.0)  # More vertices = better
        scores.append(polygon_score)
        
        return np.mean(scores)

class PerformanceMonitor:
    """Performance monitoring and metrics collection"""
    
    def __init__(self):
        self.inference_times = []
        self.class_distribution = {}
        self.quality_scores = []
        
    def log_inference(self, processing_time: float, detections: List[BananaDetection]):
        """Log inference metrics"""
        self.inference_times.append(processing_time)
        
        for detection in detections:
            class_name = detection.class_name
            self.class_distribution[class_name] = self.class_distribution.get(class_name, 0) + 1
            self.quality_scores.append(detection.quality_score)
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        if not self.inference_times:
            return {"status": "no_data"}
        
        return {
            "avg_inference_time": np.mean(self.inference_times),
            "max_inference_time": np.max(self.inference_times),
            "min_inference_time": np.min(self.inference_times),
            "total_inferences": len(self.inference_times),
            "class_distribution": self.class_distribution,
            "avg_quality_score": np.mean(self.quality_scores) if self.quality_scores else 0,
            "quality_std": np.std(self.quality_scores) if self.quality_scores else 0
        }

class SagiTechModelManager:
    """Production-grade model management system"""
    
    def __init__(self, model_path: str, config: Dict[str, Any]):
        self.model_path = Path(model_path)
        self.config = config
        self.model = None
        self.model_metadata = {}
        self.is_loaded = False
        
    def load_model(self) -> bool:
        """Load YOLOv8 model with validation"""
        try:
            if not self.model_path.exists():
                logger.error(f"Model file not found: {self.model_path}")
                return False
            
            # Calculate model checksum for verification
            model_hash = self._calculate_file_hash(self.model_path)
            logger.info(f"Loading model: {self.model_path}, Hash: {model_hash[:8]}")
            
            # Load YOLOv8 model
            self.model = YOLO(str(self.model_path))
            
            # Validate model architecture
            if not self._validate_model():
                logger.error("Model validation failed")
                return False
            
            self.model_metadata = {
                'path': str(self.model_path),
                'hash': model_hash,
                'loaded_at': datetime.now().isoformat(),
                'class_names': self.model.names if hasattr(self.model, 'names') else {},
                'input_size': self.config.get('input_size', [640, 640])
            }
            
            self.is_loaded = True
            logger.info("Model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Model loading failed: {e}")
            logger.error(traceback.format_exc())
            return False
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of model file"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    def _validate_model(self) -> bool:
        """Validate loaded model"""
        try:
            if self.model is None:
                return False
            
            # Check if model has expected attributes
            required_attrs = ['names', 'predict']
            for attr in required_attrs:
                if not hasattr(self.model, attr):
                    logger.error(f"Model missing required attribute: {attr}")
                    return False
            
            # Validate class names (should be 4 ripeness classes)
            expected_classes = {'0': 'Not Mature', '1': 'Mature', '2': 'Ripe', '3': 'Over Ripe'}
            if hasattr(self.model, 'names'):
                model_classes = self.model.names
                logger.info(f"Model classes: {model_classes}")
                
                # Flexible validation - allow different naming conventions
                if len(model_classes) != 4:
                    logger.warning(f"Expected 4 classes, found {len(model_classes)}")
            
            return True
            
        except Exception as e:
            logger.error(f"Model validation error: {e}")
            return False

class BananaDetector:
    """
    Production-grade Banana Detection & Ripeness Classification System
    Implements industrial-standard ML pipeline with YOLOv8
    """
    
    # Class mappings for ripeness detection
    RIPENESS_CLASSES = {
        0: "Not Mature",
        1: "Mature", 
        2: "Ripe",
        3: "Over Ripe"
    }
    
    def __init__(self, model_path: str = None, config: Dict[str, Any] = None):
        # Default configuration
        self.config = config or self._get_default_config()
        
        # Initialize model path
        if model_path is None:
            model_path = str(Path(__file__).parent.parent / "models" / "banana_detection" / "best.pt")
        
        # Initialize components
        self.model_manager = SagiTechModelManager(model_path, self.config)
        self.quality_validator = QualityValidator(self.config)
        self.performance_monitor = PerformanceMonitor()
        
        # Preprocessing pipeline
        self.preprocessing_pipeline = self._build_preprocessing_pipeline()
        
        # Initialize model
        self.initialize()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            'confidence_threshold': 0.75,
            'iou_threshold': 0.5,
            'input_size': [640, 640],
            'quality_thresholds': {
                'min_confidence': 0.75,
                'min_polygon_area': 100,
                'max_aspect_ratio': 5.0
            },
            'preprocessing': {
                'normalize': True,
                'resize': True
            }
        }
    
    def _build_preprocessing_pipeline(self) -> A.Compose:
        """Build image preprocessing pipeline"""
        transforms = []
        
        if self.config['preprocessing'].get('resize', True):
            size = self.config['input_size']
            transforms.append(A.Resize(height=size[0], width=size[1]))
        
        if self.config['preprocessing'].get('normalize', True):
            transforms.extend([
                A.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                    max_pixel_value=255.0
                )
            ])
        
        return A.Compose(transforms)
    
    def initialize(self) -> bool:
        """Initialize the detection system"""
        try:
            logger.info("Initializing SagiTech Banana Detection System...")
            
            # Load model
            if not self.model_manager.load_model():
                logger.error("Failed to load model")
                return False
            
            logger.info("SagiTech system initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Initialization failed: {e}")
            logger.error(traceback.format_exc())
            return False
    
    @contextmanager
    def _performance_tracking(self):
        """Context manager for performance monitoring"""
        start_time = time.time()
        try:
            yield
        finally:
            processing_time = time.time() - start_time
            logger.debug(f"Processing time: {processing_time:.3f}s")
    
    def _validate_input_image(self, image: np.ndarray) -> np.ndarray:
        """Validate and preprocess input image"""
        if image is None:
            raise ValueError("Input image is None")
        
        if len(image.shape) != 3:
            raise ValueError(f"Expected 3D image array, got shape: {image.shape}")
        
        if image.shape[2] != 3:
            raise ValueError(f"Expected RGB image with 3 channels, got {image.shape[2]}")
        
        # Convert BGR to RGB if needed (OpenCV default is BGR)
        if len(image.shape) == 3 and image.shape[2] == 3:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        return image
    
    def _run_inference(self, image: np.ndarray) -> Any:
        """Run YOLOv8 inference"""
        if not self.model_manager.is_loaded:
            raise RuntimeError("Model not loaded")
        
        try:
            # Run prediction
            results = self.model_manager.model.predict(
                image,
                conf=self.config['confidence_threshold'],
                iou=self.config['iou_threshold'],
                save=False,
                verbose=False
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Inference failed: {e}")
            raise
    
    def _process_predictions(self, results: Any, original_image: np.ndarray) -> List[BananaDetection]:
        """Process YOLOv8 predictions into structured detections"""
        detections = []
        
        if not results or len(results) == 0:
            return detections
        
        result = results[0]  # First (and only) image result
        
        # Check if we have detections
        if result.boxes is None or len(result.boxes) == 0:
            return detections
        
        image_height, image_width = original_image.shape[:2]
        
        for i in range(len(result.boxes)):
            try:
                # Extract box information
                box = result.boxes[i]
                confidence = float(box.conf.item())
                class_id = int(box.cls.item())
                
                # Get bounding box coordinates
                bbox_coords = box.xyxy[0].cpu().numpy()
                bbox = tuple(bbox_coords.astype(float))
                
                # Get polygon (segmentation mask)
                polygon = []
                if hasattr(result, 'masks') and result.masks is not None and i < len(result.masks.xy):
                    mask_coords = result.masks.xy[i]
                    if len(mask_coords) > 0:
                        polygon = [(float(x), float(y)) for x, y in mask_coords]
                
                # If no polygon, create one from bbox
                if not polygon:
                    x1, y1, x2, y2 = bbox
                    polygon = [(x1, y1), (x2, y1), (x2, y2), (x1, y2)]
                
                # Calculate area
                area = self._calculate_polygon_area(polygon)
                
                # Get class name
                class_name = self.RIPENESS_CLASSES.get(class_id, f"Unknown_{class_id}")
                
                # Create detection object
                detection = BananaDetection(
                    class_id=class_id,
                    class_name=class_name,
                    confidence=confidence,
                    polygon=polygon,
                    bbox=bbox,
                    area=area,
                    quality_score=0.0,  # Will be calculated by validator
                    timestamp=datetime.now().isoformat()
                )
                
                # Calculate quality score
                detection.quality_score = self.quality_validator.calculate_quality_score(detection)
                
                detections.append(detection)
                
            except Exception as e:
                logger.error(f"Error processing detection {i}: {e}")
                continue
        
        return detections
    
    def _calculate_polygon_area(self, polygon: List[Tuple[float, float]]) -> float:
        """Calculate polygon area using shoelace formula"""
        if len(polygon) < 3:
            return 0.0
        
        area = 0.0
        n = len(polygon)
        for i in range(n):
            j = (i + 1) % n
            area += polygon[i][0] * polygon[j][1]
            area -= polygon[j][0] * polygon[i][1]
        
        return abs(area) / 2.0
    
    def _validate_detections(self, detections: List[BananaDetection]) -> List[BananaDetection]:
        """Validate and filter detections based on quality"""
        validated_detections = []
        
        for detection in detections:
            is_valid, issues = self.quality_validator.validate_detection_quality(detection)
            
            if is_valid:
                validated_detections.append(detection)
            else:
                logger.debug(f"Detection filtered out: {issues}")
        
        return validated_detections
    
    def _format_output(self, detections: List[BananaDetection], original_image: np.ndarray) -> AnalysisResult:
        """Format final analysis result"""
        processing_time = time.time() - getattr(self, '_start_time', time.time())
        
        # Calculate quality metrics
        quality_metrics = {
            'total_detections': len(detections),
            'avg_confidence': np.mean([d.confidence for d in detections]) if detections else 0.0,
            'avg_quality_score': np.mean([d.quality_score for d in detections]) if detections else 0.0,
            'detection_density': len(detections) / (original_image.shape[0] * original_image.shape[1]) * 1000000  # per megapixel
        }
        
        # Ripeness distribution
        ripeness_counts = {}
        for detection in detections:
            ripeness_counts[detection.class_name] = ripeness_counts.get(detection.class_name, 0) + 1
        
        metadata = {
            'image_shape': original_image.shape,
            'model_version': self.model_manager.model_metadata.get('hash', 'unknown')[:8],
            'config': self.config,
            'ripeness_distribution': ripeness_counts
        }
        
        return AnalysisResult(
            success=True,
            detections=detections,
            processing_time=processing_time,
            model_version=self.model_manager.model_metadata.get('hash', 'unknown')[:8],
            quality_metrics=quality_metrics,
            metadata=metadata
        )
    
    def predict(self, image_path: str) -> Dict[str, Any]:
        """
        Main prediction method - compatible with existing interface
        
        Args:
            image_path: Path to image file or base64 encoded image
            
        Returns:
            Dictionary with legacy format for backward compatibility
        """
        try:
            result = self.classify_bananas_from_path(image_path)
            
            if not result.success:
                return self._legacy_error_format(result.error_message)
            
            return self._convert_to_legacy_format(result)
            
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            return self._legacy_error_format(str(e))
    
    def classify_bananas_from_path(self, image_path: str) -> AnalysisResult:
        """Classify bananas from image file path"""
        try:
            # Load image
            if image_path.startswith('data:image'):
                # Handle base64 encoded images
                image = self._load_base64_image(image_path)
            else:
                # Handle file paths
                image = cv2.imread(image_path)
                if image is None:
                    raise ValueError(f"Could not load image from: {image_path}")
            
            return self.classify_bananas(image)
            
        except Exception as e:
            logger.error(f"Failed to classify from path {image_path}: {e}")
            return AnalysisResult(
                success=False,
                detections=[],
                processing_time=0.0,
                model_version="unknown",
                quality_metrics={},
                metadata={},
                error_message=str(e)
            )
    
    def classify_bananas(self, image: np.ndarray) -> AnalysisResult:
        """
        Main classification method with comprehensive quality checks
        
        Args:
            image: Input image as numpy array (H, W, C)
            
        Returns:
            AnalysisResult with comprehensive detection information
        """
        self._start_time = time.time()
        
        try:
            with self._performance_tracking():
                # Input validation
                validated_image = self._validate_input_image(image)
                
                # Model inference
                raw_predictions = self._run_inference(validated_image)
                
                # Post-processing
                detections = self._process_predictions(raw_predictions, validated_image)
                
                # Quality validation
                validated_detections = self._validate_detections(detections)
                
                # Format output
                result = self._format_output(validated_detections, validated_image)
                
                # Log metrics
                self.performance_monitor.log_inference(result.processing_time, validated_detections)
                
                logger.info(f"Classification complete: {len(validated_detections)} detections in {result.processing_time:.3f}s")
                
                return result
        
        except Exception as e:
            logger.error(f"Classification failed: {e}")
            logger.error(traceback.format_exc())
            
            return AnalysisResult(
                success=False,
                detections=[],
                processing_time=time.time() - self._start_time,
                model_version="unknown",
                quality_metrics={},
                metadata={},
                error_message=str(e)
            )
    
    def _load_base64_image(self, base64_string: str) -> np.ndarray:
        """Load image from base64 string"""
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',', 1)[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_data))
        
        # Convert to numpy array
        image = np.array(pil_image)
        
        # Ensure RGB format
        if len(image.shape) == 2:  # Grayscale
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif image.shape[2] == 4:  # RGBA
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
        
        return image
    
    def _convert_to_legacy_format(self, result: AnalysisResult) -> List[Dict[str, Any]]:
        """Convert new format to legacy format for backward compatibility"""
        legacy_results = []
        
        for detection in result.detections:
            legacy_results.append({
                'bbox': [detection.bbox[0], detection.bbox[1], detection.bbox[2], detection.bbox[3]],
                'ripeness': detection.class_name,
                'confidence': detection.confidence,
                'polygon': detection.polygon,
                'area': detection.area,
                'quality_score': detection.quality_score
            })
        
        return legacy_results
    
    def _legacy_error_format(self, error_message: str) -> List[Dict[str, Any]]:
        """Return legacy error format"""
        logger.error(f"Returning legacy error: {error_message}")
        return []
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get system performance statistics"""
        return self.performance_monitor.get_performance_stats()
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return self.model_manager.model_metadata

# Global instance for compatibility
_global_detector = None

def get_detector() -> BananaDetector:
    """Get global detector instance"""
    global _global_detector
    if _global_detector is None:
        _global_detector = BananaDetector()
    return _global_detector

# Legacy compatibility function
def detect_bananas(image_path: str) -> List[Dict[str, Any]]:
    """Legacy function for backward compatibility"""
    detector = get_detector()
    return detector.predict(image_path) 