"""Test real models by calling each once with a sample image.

Usage:
    python scripts/try_models.py --image path/to/image.jpg

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
    args = parser.parse_args()

    if args.mock:
        settings.mock_models = True

    img_path = Path(args.image)
    if not img_path.exists():
        print(f"Error: Image not found: {img_path}")
        sys.exit(1)

    raw = img_path.read_bytes()
    img = imaging.normalize_upload(raw)

    client = get_client()
    print(f"Using client: {type(client).__name__}")
    print(f"Mock mode: {settings.mock_models}")
    print()

    # Test segment
    print("=== segment() ===")
    segs = []
    try:
        segs = client.segment(img)
        print(f"Found {len(segs)} segments")
        for s in segs[:3]:
            print(f"  bbox={s.bbox} score={s.score}")
    except Exception as e:
        print(f"Error: {e}")
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
        print(f"Error: {e}")
    print()

    # Test choose_candidate
    print("=== choose_candidate() ===")
    try:
        candidates = ["Nespresso Vertuo Plus", "Samsung TV remote", "Wine glass set"]
        choice, conf = client.choose_candidate(img, candidates)
        print(f"Choice: {choice} ({candidates[choice-1] if choice > 0 else 'none'})")
        print(f"Confidence: {conf}")
    except Exception as e:
        print(f"Error: {e}")
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
        print(f"Error: {e}")
    print()

    print("=== Done ===")


if __name__ == "__main__":
    main()
