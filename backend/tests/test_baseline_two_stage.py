import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["DATA_DIR"] = tempfile.mkdtemp()
os.environ["MOCK_MODELS"] = "true"
os.environ["APP_ENV"] = "dev"
os.environ["AUTO_CREATE_SCHEMA"] = "true"

from app.pipeline import baseline
from app.services.models.base import ListedObject, Segment
from app.services.models.meta import to_normalized_bbox


def test_to_normalized_bbox_xywh_pixels():
    b = to_normalized_bbox([32, 24, 64, 48], 128, 96)
    assert b == {"x": 0.25, "y": 0.25, "w": 0.5, "h": 0.5}


def test_to_normalized_bbox_xyxy_pixels_dict():
    b = to_normalized_bbox({"x1": 32, "y1": 24, "x2": 96, "y2": 72, "format": "xyxy"}, 128, 96)
    assert b == {"x": 0.25, "y": 0.25, "w": 0.5, "h": 0.5}


def test_to_normalized_bbox_normalized_xywh():
    b = to_normalized_bbox([0.25, 0.25, 0.5, 0.5], 128, 96)
    assert b == {"x": 0.25, "y": 0.25, "w": 0.5, "h": 0.5}


def test_to_normalized_bbox_normalized_xyxy():
    b = to_normalized_bbox({"x": 0.25, "y": 0.25, "w": 0.75, "h": 0.75, "format": "xyxy"}, 128, 96)
    # xyxy normalized: w = x2-x, h = y2-y
    assert b == {"x": 0.25, "y": 0.25, "w": 0.5, "h": 0.5}


def test_to_normalized_bbox_mask_derived_preferred():
    raw = {"mask": [[64, 48], [128, 96]], "bbox": [0, 0, 10, 10]}
    b = to_normalized_bbox(raw, 128, 96)
    assert b == {"x": 0.5, "y": 0.5, "w": 0.5, "h": 0.5}


def test_sliver_filtering_drops_thin_non_long():
    objs = [
        {"label": "fabric", "conf": 0.9, "bbox": {"x": 0.1, "y": 0.1, "w": 0.01, "h": 0.5}},  # aspect 50, area 0.005
        {"label": "black TV remote", "conf": 0.9, "bbox": {"x": 0.1, "y": 0.1, "w": 0.01, "h": 0.5}},  # long allowed
        {"label": "pillow", "conf": 0.2, "bbox": {"x": 0.1, "y": 0.1, "w": 0.2, "h": 0.2}},  # low score <0.35
    ]
    kept = baseline.filter_segments(objs)
    assert [o["label"] for o in kept] == ["black TV remote"]


def test_nms_same_label_and_cross_label():
    a = {"label": "remote", "conf": 0.9, "bbox": {"x": 0.1, "y": 0.1, "w": 0.2, "h": 0.2}}
    b = {"label": "remote", "conf": 0.8, "bbox": {"x": 0.11, "y": 0.11, "w": 0.2, "h": 0.2}}  # high IoU same
    c = {"label": "pillow", "conf": 0.7, "bbox": {"x": 0.1, "y": 0.1, "w": 0.2, "h": 0.2}}  # high cross >0.7
    kept = baseline.nms([a, b, c])
    assert len(kept) == 1
    assert kept[0]["conf"] == 0.9


class FakeTwoStageClient:
    def __init__(self):
        self.list_calls = 0

    def list_objects(self, image):
        self.list_calls += 1
        return [ListedObject(name="black TV remote", size="small"), ListedObject(name="Bible", size="medium"), ListedObject(name="ghost item", size="medium")]

    def segment(self, image, prompts=None):
        if prompts == ["black TV remote"]:
            return [Segment({"x": 0.4, "y": 0.5, "w": 0.03, "h": 0.15}, score=0.95)]
        if prompts == ["Bible"]:
            return [Segment({"x": 0.3, "y": 0.5, "w": 0.1, "h": 0.15}, score=0.9)]
        return []

    def verify_crop(self, crop, name):
        return (True, 0.9)

    def label(self, crop):
        raise AssertionError("label should not be used in two-stage path")


def test_two_stage_llm_listed_without_box(monkeypatch):
    monkeypatch.setattr(baseline.imaging, "crop_bbox", lambda img, box: b"crop")
    objs = baseline._objects_in_image(FakeTwoStageClient(), b"image", 0)
    labels = {o["label"]: o for o in objs}
    assert "black TV remote" in labels
    assert labels["black TV remote"]["bbox"]["w"] == 0.03
    assert labels["Bible"]["bbox"] is not None
    assert "ghost item" in labels
    assert labels["ghost item"]["bbox"] is None
    assert labels["ghost item"]["notes"] == "No box yet"


def test_close_up_behaviour(monkeypatch):
    class CloseClient:
        def name_main_object(self, image):
            return "Bible"

        def segment(self, image):
            raise AssertionError("close-up must skip segmentation")

    objs = baseline._objects_in_image(CloseClient(), b"image", 0, close_up=True)
    assert len(objs) == 1
    assert objs[0]["label"] == "Bible"
    assert objs[0]["bbox"] == {"x": 0.03, "y": 0.03, "w": 0.94, "h": 0.94}


def test_verify_low_confidence_marks_check_this_one(monkeypatch):
    monkeypatch.setattr(baseline.imaging, "crop_bbox", lambda img, box: b"crop")

    class LowClient(FakeTwoStageClient):
        def verify_crop(self, crop, name):
            return (False, 0.2)

    objs = baseline._objects_in_image(LowClient(), b"image", 0)
    assert any(o.get("notes") == "check this one" for o in objs if o.get("bbox"))

def test_batch_xyxy_overflow_detection():
    # xyxy batch where xywh would overflow image (y+h > H)
    raw = [{"bbox": [435, 618, 557, 838]}]
    from app.services.models.meta import _batch_is_xyxy, to_normalized_bbox
    assert _batch_is_xyxy(raw, 1600, 1200) is True
    b = to_normalized_bbox({"bbox": [435, 618, 557, 838], "format": "xyxy"}, 1600, 1200)
    assert abs(b["w"] - 122/1600) < 1e-6
    assert abs(b["h"] - 220/1200) < 1e-6

