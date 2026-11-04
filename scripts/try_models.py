"""Test real models by calling each once with a sample image.

Usage:
    python scripts/try_models.py --image path/to/image.jpg
    python scripts/try_models.py --image room.jpg --judge-reference remote.jpg --judge-frame room.mp4-frame.jpg

Requires MOCK_MODELS=false and valid API keys in .env.
"""
import argparse
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.config import settings
from app.services.models import get_client
from app.services import imaging


def main():
    parser = argparse.ArgumentParser(description="Test real models with a sample image")
    parser.add_argument("--image", required=True, help="Path to a sample image")
    parser.add_argument("--mock", action="store_true", help="Force mock mode")
    parser.add_argument("--judge-reference", type=Path, help="Reference crop for an optional real judge call")
    parser.add_argument("--judge-context", type=Path, help="Optional wider baseline image for judge()")
    parser.add_argument(
        "--judge-frame",
        type=Path,
        action="append",
        default=[],
        help="Walkthrough frame for judge(); repeat to test multiple frames",
    )
    args = parser.parse_args()

    if args.mock:
        settings.mock_models = True

    paths = [Path(args.image)]
    if args.judge_reference:
        paths.append(args.judge_reference)
    if args.judge_context:
        paths.append(args.judge_context)
    paths.extend(args.judge_frame)
    missing = [path for path in paths if not path.is_file()]
    if missing:
        parser.error("Image file not found: " + ", ".join(str(path) for path in missing))
    if bool(args.judge_reference) != bool(args.judge_frame):
        parser.error("--judge-reference and at least one --judge-frame must be supplied together")
    if args.judge_context and not args.judge_reference:
        parser.error("--judge-context requires --judge-reference")

    img_path = Path(args.image)
    raw = img_path.read_bytes()
    img = imaging.normalize_upload(raw)

    client = get_client()
    print(f"Using client: {type(client).__name__}")
    print(f"Mock mode: {settings.mock_models}")
    print()
    failures = []

    def report_error(operation, error):
        failures.append(operation)
        print(f"Error: {error}")

    # Test segment
    print("=== segment() ===")
    segs = []
    try:
        segs = client.segment(img)
        print(f"Found {len(segs)} segments")
        for s in segs[:3]:
            print(f"  bbox={s.bbox} score={s.score}")
    except Exception as e:
        report_error("segment", e)
    print()

    # Test label
    print("=== label() ===")
    try:
        # Use first segment crop or whole image
        if segs:
            crop = imaging.crop_bbox(img, segs[0].bbox)
        else:
            crop = img
        lab = client.label(crop)
        print(f"Label: {lab.label}")
        print(f"Category: {lab.category}")
        print(f"Confidence: {lab.confidence}")
        print(f"Brand: {lab.brand}")
        print(f"Model: {lab.model}")
    except Exception as e:
        report_error("label", e)
    print()

    # Test choose_candidate
    print("=== choose_candidate() ===")
    try:
        candidates = ["Nespresso Vertuo Plus", "Samsung TV remote", "Wine glass set"]
        choice, conf = client.choose_candidate(img, candidates)
        print(f"Choice: {choice} ({candidates[choice-1] if choice > 0 else 'none'})")
        print(f"Confidence: {conf}")
    except Exception as e:
        report_error("choose_candidate", e)
    print()

    # Test guide
    print("=== guide() ===")
    try:
        guide = client.guide(img, "Nespresso Vertuo Plus", "Push the button twice for espresso.")
        print(f"Title: {guide.title}")
        print(f"Steps: {guide.steps}")
        print(f"Warnings: {guide.warnings}")
        print(f"Seen: {guide.seen}")
        print(f"Unsure: {guide.unsure}")
    except Exception as e:
        report_error("guide", e)
    print()

    if args.judge_reference:
        print("=== judge() ===")
        try:
            reference = imaging.normalize_upload(args.judge_reference.read_bytes())
            context = (
                imaging.normalize_upload(args.judge_context.read_bytes())
                if args.judge_context
                else None
            )
            frames = [
                imaging.normalize_upload(frame_path.read_bytes())
                for frame_path in args.judge_frame
            ]
            result = client.judge(
                reference,
                context,
                frames,
                "sample item",
                1,
                "sample location",
            )
            print(f"Result: {result}")
        except Exception as e:
            report_error("judge", e)
        print()

    print("=== Done ===")
    if failures:
        print("Failed model calls: " + ", ".join(failures))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
