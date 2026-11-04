"""Score a completed real-video audit manifest."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.accuracy import OUTCOMES, evaluate_manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "manifest",
        type=Path,
        help="CSV manifest with expected/actual findings and video paths",
    )
    args = parser.parse_args()

    result = evaluate_manifest(args.manifest)
    if result["errors"]:
        print(f"Accuracy report not produced: {len(result['errors'])} issue(s).")
        for error in result["errors"]:
            print(f"- {error}")
        return 2

    print(f"Cases: {result['total']}")
    print(f"Exact outcome accuracy: {result['accuracy']:.1%} ({result['correct']}/{result['total']})")
    precision = result["missing_precision"]
    recall = result["missing_recall"]
    print(f"Missing precision: {'n/a' if precision is None else f'{precision:.1%}'}")
    print(f"Missing recall: {'n/a' if recall is None else f'{recall:.1%}'}")
    print(f"False missing findings: {result['false_missing']}")
    print("Confusion matrix (rows=expected, columns=actual):")
    print("expected\\actual," + ",".join(OUTCOMES))
    for expected in OUTCOMES:
        values = (str(result["confusion"][expected][actual]) for actual in OUTCOMES)
        print(f"{expected}," + ",".join(values))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
