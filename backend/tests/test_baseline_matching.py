import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["DATA_DIR"] = tempfile.mkdtemp()
os.environ["MOCK_MODELS"] = "true"
os.environ["APP_ENV"] = "dev"
os.environ["AUTO_CREATE_SCHEMA"] = "true"

from app.pipeline import baseline
from app.pipeline.matching import dedupe
from app.services.models.base import Label, Segment


def test_dedupe_matches_through_intermediate_frames():
    boxes = [
        {"x": 0.10, "y": 0.2, "w": 0.30, "h": 0.3},
        {"x": 0.26, "y": 0.2, "w": 0.30, "h": 0.3},
        {"x": 0.42, "y": 0.2, "w": 0.30, "h": 0.3},
    ]
    objects = [
        {"label": "Sofa", "bbox": box, "frame": frame, "crop": b"same", "conf": 0.7}
        for frame, box in enumerate(boxes)
    ]

    kept = dedupe(objects)

    assert len(kept) == 1
    assert kept[0]["frame"] == 0


def test_dedupe_keeps_distinct_same_label_objects_in_one_frame():
    objects = [
        {"label": "Glass", "bbox": {"x": 0.1, "y": 0.2, "w": 0.1, "h": 0.2},
         "frame": 0, "crop": b"one", "conf": 0.8},
        {"label": "Glass", "bbox": {"x": 0.7, "y": 0.2, "w": 0.1, "h": 0.2},
         "frame": 0, "crop": b"two", "conf": 0.9},
        {"label": "Glass", "bbox": {"x": 0.12, "y": 0.2, "w": 0.1, "h": 0.2},
         "frame": 1, "crop": b"one", "conf": 0.95},
        {"label": "Glass", "bbox": {"x": 0.72, "y": 0.2, "w": 0.1, "h": 0.2},
         "frame": 1, "crop": b"two", "conf": 0.96},
    ]

    kept = dedupe(objects)

    assert len(kept) == 2
    assert {item["frame"] for item in kept} == {1}


def test_objects_in_image_skips_background_and_low_quality_segments(monkeypatch):
    segments = [
        Segment({"x": 0.1, "y": 0.1, "w": 0.8, "h": 0.7}, score=0.9),
        Segment({"x": 0.1, "y": 0.1, "w": 0.2, "h": 0.2}, score=0.05),
        Segment({"x": 0.2, "y": 0.2, "w": 0.2, "h": 0.2}, score=0.9),
        Segment({"x": 0.5, "y": 0.2, "w": 0.2, "h": 0.2}, score=0.9),
        Segment({"x": 0.3, "y": 0.5, "w": 0.2, "h": 0.2}, score=0.9),
        Segment({"x": 0.6, "y": 0.5, "w": 0.2, "h": 0.2}, score=0.9),
    ]
    labels = iter([
        Label("Chair", category="structure"),
        Label("Wall"),
        Label("Wall clock"),
        Label("Floor"),
    ])
    label_calls = []
    monkeypatch.setattr(baseline, "_label_cache", {})

    def crop(image, box):
        assert image == b"image"
        return str(box["x"]).encode()

    monkeypatch.setattr(baseline.imaging, "crop_bbox", crop)

    class Client:
        def segment(self, image):
            assert image == b"image"
            return segments

        def label(self, crop):
            label_calls.append(crop)
            return next(labels)

    objects = baseline._objects_in_image(Client(), b"image", 0)

    assert [obj["label"] for obj in objects] == ["Wall clock"]
    assert len(label_calls) == 4
