import os
import io
try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover
    cv2 = None  # Graceful degradation; functions will no-op when unavailable
import sys
import time
import json
import math
import base64
import typing as t
from dataclasses import dataclass, field
from datetime import datetime, timezone

import numpy as np

try:
    from ultralytics import YOLO  # type: ignore
except Exception:  # pragma: no cover - optional at import time
    YOLO = None  # Lazy error on use


ExpectedCategory = t.Literal["Not Mature", "Mature", "Ripe", "Over Ripe"]


@dataclass
class DetectorConfig:
    model_path: str = field(default_factory=lambda: os.environ.get(
        "SAGITECH_MODEL_PATH", "/workspace/backend/ml/banana_detection/model/best.pt"
    ))
    device: t.Optional[str] = None  # "cuda", "cpu", or specific index like "0"
    max_image_size: int = 1024
    enable_polygon_extraction: bool = True
    batch_processing: bool = True
    confidence_threshold: float = 0.5
    iou_threshold: float = 0.5
    # Optional per-category threshold overrides
    confidence_thresholds_by_category: t.Dict[ExpectedCategory, float] = field(
        default_factory=lambda: {
            "Not Mature": 0.5,
            "Mature": 0.55,
            "Ripe": 0.55,
            "Over Ripe": 0.5,
        }
    )


class SagiTechBananaClassifier:
    """YOLOv8-based saba banana maturity classifier with segmentation polygons."""

    def __init__(self, config: DetectorConfig | None = None) -> None:
        self.config = config or DetectorConfig()

        # Never raise on import-time dependency issues; degrade gracefully
        model_path = self._resolve_model_path(self.config.model_path)

        if YOLO is None or not model_path or not os.path.exists(model_path):
            if YOLO is None:
                sys.stderr.write(
                    "[SagiTech] Warning: ultralytics not installed; predictions will be empty.\n"
                )
            if not model_path or not os.path.exists(model_path):
                sys.stderr.write(
                    f"[SagiTech] Warning: model weights not found at '{self.config.model_path}'.\n"
                )
            self._model = None
        else:
            self._model = YOLO(model_path)

        # Convenience attributes expected by performance tests
        self.max_image_size = self.config.max_image_size
        self.enable_polygon_extraction = self.config.enable_polygon_extraction
        self.batch_processing = self.config.batch_processing
        self.confidence_threshold = self.config.confidence_threshold

        # Class mapping
        self.expected_categories: list[ExpectedCategory] = [
            "Not Mature",
            "Mature",
            "Ripe",
            "Over Ripe",
        ]
        self.class_id_to_category: dict[int, ExpectedCategory] = {}
        self._initialize_class_mapping()

    # ------------------------
    # Public API
    # ------------------------

    def preprocess_image(self, image_bgr: np.ndarray) -> np.ndarray:
        """Enhance and normalize with size constraint for robust inference."""
        if image_bgr is None:
            return image_bgr
        img = image_bgr
        # Resize while preserving aspect ratio
        h, w = img.shape[:2]
        if self.config.max_image_size and max(h, w) > self.config.max_image_size and cv2 is not None:
            scale = self.config.max_image_size / float(max(h, w))
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        if cv2 is None:
            # No OpenCV available; skip color/denoise steps
            return img

        # Convert to LAB and apply CLAHE on L channel for contrast normalization
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l2 = clahe.apply(l)
        lab2 = cv2.merge((l2, a, b))
        img = cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)

        # Mild denoise
        img = cv2.bilateralFilter(img, d=5, sigmaColor=50, sigmaSpace=50)

        return img

    def classify_bananas(self, image_bgr: np.ndarray) -> list[dict]:
        """Main classification logic. Returns per-banana dictionaries.

        Each dictionary contains: category, confidence, polygon, bbox, area, timestamp
        """
        now_iso = datetime.now(timezone.utc).isoformat()

        if self._model is None:
            # Graceful empty result if model not yet available
            return []

        preprocessed = self.preprocess_image(image_bgr)

        # Run inference
        device = self.config.device
        try:
            results = self._model.predict(
                source=preprocessed,
                device=device,
                conf=self.config.confidence_threshold,
                iou=self.config.iou_threshold,
                verbose=False,
                imgsz=max(preprocessed.shape[:2]),
                half=False,
                stream=False,
            )
        except Exception as e:
            sys.stderr.write(f"[SagiTech] Inference error: {e}\n")
            return []

        if not results:
            return []

        result = results[0]
        return self._extract_items_from_result(result, now_iso)

    def validate_classification(self, results: list[dict]) -> dict:
        """Simple validation with overlap and consistency checks."""
        report: dict[str, t.Any] = {
            "num_items": len(results),
            "warnings": [],
            "category_counts": self.count_by_category(results),
            "average_confidence": round(
                float(np.mean([r["confidence"] for r in results])) if results else 0.0, 6
            ),
        }

        # Detect overlapping different-category polygons with high IoU
        if len(results) > 1:
            for i in range(len(results)):
                for j in range(i + 1, len(results)):
                    pi = np.array(results[i]["polygon"], dtype=np.float32)
                    pj = np.array(results[j]["polygon"], dtype=np.float32)
                    iou = self._polygon_iou(pi, pj)
                    if iou > 0.3 and results[i]["category"] != results[j]["category"]:
                        report["warnings"].append(
                            f"Overlapping polygons with different categories (IoU={iou:.2f})"
                        )

        return report

    def draw_overlays(self, image_bgr: np.ndarray, results: list[dict]) -> np.ndarray:
        """Draw polygons and labels on the image for visualization."""
        if cv2 is None:
            return image_bgr
        overlay = image_bgr.copy()
        for item in results:
            poly = np.array(item["polygon"], dtype=np.int32)
            color = self._category_color(item["category"])  # BGR
            cv2.polylines(overlay, [poly], isClosed=True, color=color, thickness=2)

            x, y, w, h = item["bbox"]
            label = f"{item['category']} {item['confidence']:.2f}"
            cv2.rectangle(overlay, (int(x), int(y) - 22), (int(x) + 200, int(y)), color, -1)
            cv2.putText(
                overlay,
                label,
                (int(x) + 5, int(y) - 6),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )
        return overlay

    def count_by_category(self, results: list[dict]) -> dict[ExpectedCategory, int]:
        counts: dict[ExpectedCategory, int] = {
            "Not Mature": 0,
            "Mature": 0,
            "Ripe": 0,
            "Over Ripe": 0,
        }
        for r in results:
            cat = r.get("category")
            if cat in counts:
                counts[t.cast(ExpectedCategory, cat)] += 1
        return counts

    # ------------------------
    # Convenience methods used by tests/integration
    # ------------------------

    def predict_from_bytes(self, image_bytes: bytes) -> list[dict]:
        if cv2 is None:
            return []
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return []
        return self.classify_bananas(img)

    def predict_from_path(self, image_path: str) -> list[dict]:
        if cv2 is None:
            return []
        img = cv2.imread(image_path, cv2.IMREAD_COLOR)
        if img is None:
            return []
        return self.classify_bananas(img)

    def classify_batch(self, images_bgr: list[np.ndarray]) -> list[list[dict]]:
        if not images_bgr:
            return []
        if not self.batch_processing:
            return [self.classify_bananas(img) for img in images_bgr]

        # Preprocess all, run in a loop (Ultralytics also supports list inputs)
        processed = [self.preprocess_image(img) for img in images_bgr]
        if self._model is None:
            return [[] for _ in processed]

        try:
            results = self._model.predict(
                source=processed,
                device=self.config.device,
                conf=self.config.confidence_threshold,
                iou=self.config.iou_threshold,
                verbose=False,
                imgsz=max(max(img.shape[:2]) for img in processed),
                stream=False,
            )
        except Exception as e:
            sys.stderr.write(f"[SagiTech] Batch inference error: {e}\n")
            return [[] for _ in processed]

        now_iso = datetime.now(timezone.utc).isoformat()
        outputs: list[list[dict]] = []
        for res in results:
            outputs.append(self._extract_items_from_result(res, now_iso))
        return outputs

    # ------------------------
    # Internal helpers
    # ------------------------

    def _resolve_model_path(self, configured_path: str) -> str | None:
        candidates = [
            configured_path,
            "/workspace/backend/ml/banana_detection/best.pt",
            "/workspace/ml/banana_detection/best.pt",
            "/workspace/backend/ml/banana_detection/model/best.pt",
        ]
        for p in candidates:
            if p and os.path.exists(p):
                return p
        return configured_path

    def _initialize_class_mapping(self) -> None:
        # Map class indices to expected categories by matching model names to known labels
        if self._model is None:
            self.class_id_to_category = {}
            return
        try:
            model_names = getattr(self._model, "names", {}) or {}
        except Exception:
            model_names = {}

        # Normalize function
        def norm(s: str) -> str:
            return s.strip().lower().replace("_", " ").replace("-", " ")

        inverse_lookup = {
            norm("Not Mature"): "Not Mature",
            norm("Mature"): "Mature",
            norm("Ripe"): "Ripe",
            norm("Over Ripe"): "Over Ripe",
            norm("Overripe"): "Over Ripe",
            norm("Over-Ripe"): "Over Ripe",
        }

        mapping: dict[int, ExpectedCategory] = {}
        if isinstance(model_names, dict) and model_names:
            for class_id, name in model_names.items():
                cname = inverse_lookup.get(norm(str(name)))
                if cname:
                    mapping[int(class_id)] = t.cast(ExpectedCategory, cname)

        # Fallback: assume 0..3 correspond in the expected order
        if not mapping:
            mapping = {0: "Not Mature", 1: "Mature", 2: "Ripe", 3: "Over Ripe"}

        self.class_id_to_category = mapping

    def _map_name_to_category(self, name: str | int) -> ExpectedCategory | None:
        s = str(name)
        s_norm = s.strip().lower().replace("_", " ").replace("-", " ")
        if "not" in s_norm and "mature" in s_norm:
            return "Not Mature"
        if s_norm == "mature" or ("mature" in s_norm and "not" not in s_norm):
            return "Mature"
        if "ripe" in s_norm and "over" not in s_norm:
            return "Ripe"
        if "over" in s_norm and "ripe" in s_norm:
            return "Over Ripe"
        return None

    def _smooth_polygon(self, polygon: list[tuple[float, float]]) -> list[tuple[float, float]]:
        if cv2 is None or not polygon or len(polygon) < 4:
            return polygon
        pts = np.array(polygon, dtype=np.float32)
        # Approximate polygon to reduce noise
        peri = cv2.arcLength(pts, True)
        eps = 0.01 * peri  # small epsilon keeps shape while smoothing
        approx = cv2.approxPolyDP(pts, eps, True)
        approx_pts = [(float(p[0][0]), float(p[0][1])) for p in approx]
        return approx_pts if len(approx_pts) >= 4 else polygon

    def _polygon_area(self, polygon: list[tuple[float, float]]) -> float:
        # Shoelace formula
        if len(polygon) < 3:
            return 0.0
        x = np.array([p[0] for p in polygon], dtype=np.float64)
        y = np.array([p[1] for p in polygon], dtype=np.float64)
        return 0.5 * float(abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1))))

    def _polygon_iou(self, p1: np.ndarray, p2: np.ndarray) -> float:
        # Rasterization-based IoU to avoid heavy geometry deps
        if cv2 is None:
            return 0.0
        try:
            # Determine a bounding canvas
            all_pts = np.vstack([p1, p2])
            min_x, min_y = np.floor(all_pts.min(axis=0)).astype(int)
            max_x, max_y = np.ceil(all_pts.max(axis=0)).astype(int)
            w = int(max(1, max_x - min_x + 1))
            h = int(max(1, max_y - min_y + 1))
            canvas1 = np.zeros((h, w), dtype=np.uint8)
            canvas2 = np.zeros((h, w), dtype=np.uint8)
            cv2.fillPoly(canvas1, [np.round(p1 - [min_x, min_y]).astype(np.int32)], 1)
            cv2.fillPoly(canvas2, [np.round(p2 - [min_x, min_y]).astype(np.int32)], 1)
            inter = np.logical_and(canvas1, canvas2).sum()
            union = np.logical_or(canvas1, canvas2).sum()
            return float(inter) / float(union) if union > 0 else 0.0
        except Exception:
            return 0.0

    def _category_color(self, category: ExpectedCategory) -> tuple[int, int, int]:
        return {
            "Not Mature": (0, 180, 0),      # green-ish
            "Mature": (0, 215, 255),        # gold-ish
            "Ripe": (0, 165, 255),          # orange-ish
            "Over Ripe": (60, 60, 60),      # dark gray
        }[category]

    def _extract_items_from_result(self, result: t.Any, timestamp_iso: str | None = None) -> list[dict]:
        """Convert a single Ultralytics result to normalized items."""
        now_iso = timestamp_iso or datetime.now(timezone.utc).isoformat()

        # Names mapping from model
        names: dict[int, str] = {}
        try:
            names = result.names or getattr(self._model, "names", {}) or {}
        except Exception:
            names = getattr(self._model, "names", {}) or {}

        final_items: list[dict] = []

        boxes = getattr(result, "boxes", None)
        masks = getattr(result, "masks", None)

        if boxes is None:
            return []

        # Extract polygons if available and enabled
        polygons_list: list[list[tuple[float, float]]] | None = None
        if self.config.enable_polygon_extraction and masks is not None and hasattr(masks, "xy"):
            try:
                polygons_list = [
                    [(float(x), float(y)) for x, y in poly]
                    for poly in masks.xy  # type: ignore[attr-defined]
                ]
            except Exception:
                polygons_list = None
        else:
            polygons_list = None

        # Iterate over detections
        try:
            xywh_boxes = boxes.xywh.cpu().numpy() if hasattr(boxes, "xywh") else None
            confs = boxes.conf.cpu().numpy() if hasattr(boxes, "conf") else None
            clses = boxes.cls.cpu().numpy().astype(int) if hasattr(boxes, "cls") else None
        except Exception:
            return []

        if xywh_boxes is None or confs is None or clses is None:
            return []

        for idx in range(len(xywh_boxes)):
            class_id = int(clses[idx])
            confidence = float(confs[idx])
            category = self.class_id_to_category.get(class_id)

            if category is None:
                # Try to map via name string fallback
                name = names.get(class_id, str(class_id))
                category = self._map_name_to_category(name)
                if category is None:
                    continue

            # Threshold per category
            threshold = self.config.confidence_thresholds_by_category.get(
                category, self.config.confidence_threshold
            )
            if confidence < threshold:
                continue

            x_c, y_c, w, h = xywh_boxes[idx]
            x = float(x_c - w / 2.0)
            y = float(y_c - h / 2.0)
            bbox = [max(0.0, x), max(0.0, y), float(w), float(h)]

            polygon: list[tuple[float, float]] | None = None
            if polygons_list is not None and idx < len(polygons_list):
                polygon = self._smooth_polygon(polygons_list[idx])
            else:
                # Approximate polygon as bbox corners if masks are unavailable
                polygon = [
                    (bbox[0], bbox[1]),
                    (bbox[0] + bbox[2], bbox[1]),
                    (bbox[0] + bbox[2], bbox[1] + bbox[3]),
                    (bbox[0], bbox[1] + bbox[3]),
                ]

            area = float(self._polygon_area(polygon))

            item = {
                "category": category,
                "confidence": round(confidence, 6),
                "polygon": [(float(px), float(py)) for px, py in polygon],
                "bbox": [round(float(v), 3) for v in bbox],
                "area": round(area, 3),
                "timestamp": now_iso,
            }
            final_items.append(item)

        return final_items


# Public factory used by tests
_DEF_INSTANCE: SagiTechBananaClassifier | None = None

def get_banana_detector() -> SagiTechBananaClassifier:
    global _DEF_INSTANCE
    if _DEF_INSTANCE is None:
        _DEF_INSTANCE = SagiTechBananaClassifier()
    return _DEF_INSTANCE 