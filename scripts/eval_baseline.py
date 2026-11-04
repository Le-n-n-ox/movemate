"""Eval baseline pipeline on a folder of photos with expected JSON.

Expected format (expected.json in the photo folder):
[
  {"photo": "sofa.jpg", "items": [{"name": "black TV remote", "bbox": {"x":0.37,"y":0.54,"w":0.04,"h":0.17}}]}
]

Runs _objects_in_image with the real client (MOCK_MODELS=false) and prints
per-photo recall, precision, sliver/duplicate counts. Matching is by label
substring + IoU > 0.1 (rough boxes), or label-only if bbox is null in expected.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.pipeline.matching import iou  # noqa: E402
from app.pipeline.baseline import _objects_in_image, _aspect  # noqa: E402
from app.services import imaging  # noqa: E402
from app.services.models import get_client  # noqa: E402


def _match(expected, objs):
    used = set()
    hits = 0
    for exp in expected:
        name = (exp.get("name") or "").casefold()
        eb = exp.get("bbox")
        best, best_iou = None, -1.0
        for j, o in enumerate(objs):
            if j in used:
                continue
            if name not in o["label"].casefold() and o["label"].casefold() not in name:
                continue
            score = iou(eb, o["bbox"]) if eb and o.get("bbox") else (0.5 if o.get("bbox") else 0.2)
            if score > best_iou:
                best, best_iou = j, score
        if best is not None and best_iou > 0.1:
            hits += 1
            used.add(best)
    return hits, used


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--expected", default="expected.json")
    args = ap.parse_args()
    folder = Path(args.folder)
    expected_path = folder / args.expected
    if not expected_path.exists():
        print(f"expected file not found: {expected_path}")
        print("Add expected.json with {photo, items:[{name,bbox}]} entries. User to supply 5 demo photos.")
        return 1
    data = json.loads(expected_path.read_text())
    client = get_client()
    total_expected = total_hits = total_kept = 0
    for entry in data:
        photo = folder / entry["photo"]
        if not photo.exists():
            print(f"{photo.name}: missing file")
            continue
        img = imaging.normalize_upload(photo.read_bytes())
        objs = _objects_in_image(client, img, 0)
        expected = entry.get("items", [])
        hits, used = _match(expected, objs)
        kept = [o for o in objs if o.get("bbox")]
        slivers = sum(1 for o in kept if _aspect(o["bbox"]) > 6 and "remote" not in o["label"].casefold())
        # duplicates: same label with IoU>0.5
        dups = 0
        for i in range(len(kept)):
            for j in range(i + 1, len(kept)):
                if kept[i]["label"].casefold() == kept[j]["label"].casefold() and iou(kept[i]["bbox"], kept[j]["bbox"]) > 0.5:
                    dups += 1
        recall = hits / len(expected) if expected else 0
        precision = hits / len(kept) if kept else 0
        print(f"{photo.name}: recall={recall:.2f} ({hits}/{len(expected)}) precision={precision:.2f} kept={len(kept)} slivers={slivers} duplicates={dups}")
        total_expected += len(expected); total_hits += hits; total_kept += len(kept)
    print(f"TOTAL recall={total_hits/max(1,total_expected):.2f} precision={total_hits/max(1,total_kept):.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
