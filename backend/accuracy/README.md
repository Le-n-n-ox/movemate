# Real-video audit accuracy set

The CSV manifest contains the planned 15 scenarios from the backend guide. It is a test plan, not a result set: video paths and observed outcomes are intentionally blank until real audits are recorded.

## Run the evaluation

1. Capture the scenario videos using the matching `case_id`; include all required rooms for cross-room moves.
2. Save the clips under `backend/accuracy/videos/`. Video files in this folder are git-ignored; keep private property footage local and obtain consent before recording.
3. Run each clip through the configured MoveMate audit pipeline and review its resulting finding. Record the observed outcome in the `actual` column; use only `present`, `missing`, `misplaced`, `count_mismatch`, or `unverified`.
4. Put the clip's path relative to this folder in `video_path`, and add review details to `notes`.
5. From the repository root, run:

   ```powershell
   python scripts/evaluate_audit_accuracy.py backend/accuracy/manifest.csv
   ```

The evaluator refuses to score rows without an expected outcome, reviewed actual outcome, and existing video. It reports exact outcome accuracy, missing precision and recall, false-missing count, and a confusion matrix. Keep the reviewed clips and results together when comparing model/configuration changes. Do not count mock-model results as real-world accuracy.

This evaluation does not run the model or create audit records by itself; it scores results recorded after running the videos through the app.
