import csv

from app.accuracy import OUTCOMES, evaluate_manifest, score_rows


def test_score_rows_reports_exact_accuracy_and_missing_metrics():
    rows = [
        {
            "case_id": "removed",
            "expected": "missing",
            "actual": "missing",
            "video_path": "removed.mp4",
        },
        {
            "case_id": "present",
            "expected": "present",
            "actual": "missing",
            "video_path": "present.mp4",
        },
        {
            "case_id": "unfilmed",
            "expected": "unverified",
            "actual": "unverified",
            "video_path": "unfilmed.mp4",
        },
    ]

    report = score_rows(rows)

    assert report["accuracy"] == 2 / 3
    assert report["missing_precision"] == 0.5
    assert report["missing_recall"] == 1.0
    assert report["false_missing"] == 1
    assert report["confusion"]["present"]["missing"] == 1


def test_incomplete_rows_are_not_scored_as_successes():
    report = score_rows(
        [
            {
                "case_id": "pending",
                "expected": "missing",
                "actual": "",
                "video_path": "",
            }
        ]
    )

    assert report["errors"]
    assert "pending: actual is not recorded" in report["errors"]
    assert "pending: video_path is not recorded" in report["errors"]


def test_manifest_requires_existing_videos(tmp_path):
    manifest = tmp_path / "manifest.csv"
    with manifest.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file, fieldnames=["case_id", "scenario", "expected", "actual", "video_path", "notes"]
        )
        writer.writeheader()
        writer.writerow(
            {
                "case_id": "case-1",
                "scenario": "removed",
                "expected": "missing",
                "actual": "missing",
                "video_path": "missing.mp4",
                "notes": "",
            }
        )

    result = evaluate_manifest(manifest)

    assert result["errors"]
    assert "video not found" in result["errors"][0]
    assert set(OUTCOMES) == {
        "present",
        "missing",
        "misplaced",
        "count_mismatch",
        "unverified",
    }


def test_complete_manifest_scores_existing_videos(tmp_path):
    video = tmp_path / "present.mp4"
    video.write_bytes(b"recorded test clip")
    manifest = tmp_path / "manifest.csv"
    with manifest.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file, fieldnames=["case_id", "scenario", "expected", "actual", "video_path", "notes"]
        )
        writer.writeheader()
        writer.writerow(
            {
                "case_id": "case-1",
                "scenario": "in place",
                "expected": "present",
                "actual": "present",
                "video_path": video.name,
                "notes": "",
            }
        )

    report = evaluate_manifest(manifest)

    assert report["errors"] == []
    assert report["accuracy"] == 1.0
    assert report["confusion"]["present"]["present"] == 1
