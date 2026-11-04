"""Scoring helpers for manually reviewed real-video audit runs."""

import csv
from pathlib import Path
from typing import Iterable


OUTCOMES = ("present", "missing", "misplaced", "count_mismatch", "unverified")
REQUIRED_COLUMNS = {"case_id", "scenario", "expected", "actual", "video_path", "notes"}


def score_rows(rows: Iterable[dict[str, str]]) -> dict:
    """Score labeled audit outcomes without treating unreviewed cases as correct."""
    completed = []
    errors = []
    seen_ids = set()

    for line_number, row in enumerate(rows, start=2):
        case_id = row.get("case_id", "").strip()
        expected = row.get("expected", "").strip()
        actual = row.get("actual", "").strip()
        video_path = row.get("video_path", "").strip()

        if not case_id:
            errors.append(f"row {line_number}: case_id is required")
            continue
        if case_id in seen_ids:
            errors.append(f"row {line_number}: duplicate case_id {case_id!r}")
        seen_ids.add(case_id)

        for field, value in (("expected", expected), ("actual", actual)):
            if not value:
                errors.append(f"{case_id}: {field} is not recorded")
            elif value not in OUTCOMES:
                errors.append(f"{case_id}: invalid {field} outcome {value!r}")
        if not video_path:
            errors.append(f"{case_id}: video_path is not recorded")
        if expected in OUTCOMES and actual in OUTCOMES and video_path:
            completed.append((expected, actual))

    if errors:
        return {"errors": errors, "total": len(seen_ids)}

    total = len(completed)
    correct = sum(expected == actual for expected, actual in completed)
    missing_true_positive = sum(
        expected == actual == "missing" for expected, actual in completed
    )
    missing_false_positive = sum(
        expected != "missing" and actual == "missing"
        for expected, actual in completed
    )
    missing_false_negative = sum(
        expected == "missing" and actual != "missing"
        for expected, actual in completed
    )

    confusion = {
        expected: {
            actual: sum(
                row_expected == expected and row_actual == actual
                for row_expected, row_actual in completed
            )
            for actual in OUTCOMES
        }
        for expected in OUTCOMES
    }
    precision_denominator = missing_true_positive + missing_false_positive
    recall_denominator = missing_true_positive + missing_false_negative

    return {
        "total": total,
        "correct": correct,
        "accuracy": correct / total if total else 0.0,
        "missing_precision": (
            missing_true_positive / precision_denominator
            if precision_denominator
            else None
        ),
        "missing_recall": (
            missing_true_positive / recall_denominator if recall_denominator else None
        ),
        "false_missing": missing_false_positive,
        "confusion": confusion,
        "errors": [],
    }


def evaluate_manifest(manifest_path: Path) -> dict:
    """Load, validate video paths, and score a CSV audit manifest."""
    with manifest_path.open(newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        columns = set(reader.fieldnames or ())
        missing_columns = sorted(REQUIRED_COLUMNS - columns)
        if missing_columns:
            return {
                "errors": [f"missing CSV columns: {', '.join(missing_columns)}"],
                "total": 0,
            }

        rows = list(reader)

    result = score_rows(rows)
    if result["errors"]:
        return result

    missing_videos = []
    for line_number, row in enumerate(rows, start=2):
        video = (row["video_path"] or "").strip()
        path = (manifest_path.parent / video).resolve()
        if not path.is_file():
            missing_videos.append(
                f"row {line_number} ({row['case_id']}): video not found: {video}"
            )
    if missing_videos:
        result["errors"] = missing_videos
    return result
