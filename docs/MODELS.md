# Model client: implementation and verification status

The provider adapters are implemented in `backend/app/services/models/meta.py`. Automated tests exercise request construction, response parsing, image encoding, judge retries, and the multi-image judge payload using mocked HTTP responses. These tests verify our client contract; they do **not** prove that a live provider accepts the configured model names, payloads, limits, or credentials.

## Configuration

- `META_API_BASE` and `META_API_KEY` configure the Meta-compatible `/responses` client.
- `META_SEGMENT_MODEL`, `META_LABEL_MODEL`, and `META_REASON_MODEL` select the models. Current code defaults are `sam-3.1`, `muse-image`, and `muse-spark`; confirm the account's actual model IDs before live use.
- `VISION_LLM_URL` optionally selects the separate image-array judge endpoint; `VISION_LLM_KEY` is sent as an `Api-Key` authorization header.
- Keep provider credentials in `.env`; do not commit them or print them in test output.

| Model | Used for | Input | Video input? | Output shape | Rate limit | Notes |
|---|---|---|---|---|---|---|
| Segmentation model (`META_SEGMENT_MODEL`) | find object regions | One data-URI image in `input` | No | JSON array of pixel boxes and scores | Not measured | Client normalizes pixel boxes when dimensions are known. Live schema unverified. |
| Label model (`META_LABEL_MODEL`) | name one crop | One data-URI image in `input` | No | JSON label/category/confidence and optional brand/model | Not measured | Live schema and accuracy unverified. |
| Reasoning model (`META_REASON_MODEL`) | guest guide, candidate choice, or judge fallback | Image data URIs and prompt in `input` | No | JSON parsed into interface dataclasses | Not measured | Multi-image encoding is covered by request tests, not live provider verification. |
| Configured VLM (`VISION_LLM_URL`) | audit judging | Array of base64 images and prompt | No | JSON judgement | Not measured | Sends `temperature: 0`; supports a few response envelope shapes. Verify against the chosen endpoint. |

## Client-contract examples (mocked HTTP)

The examples below describe the current implementation and its tests. They are illustrative, not captured live-provider traffic.

### Segmentation response text

```json
[
  {"bbox": [120, 250, 80, 100], "score": 0.95},
  {"bbox": [300, 400, 50, 40], "score": 0.90}
]
```

Coordinates are divided by the source image's width and height to produce normalized boxes.

### Label response text

```json
{"label": "Samsung TV remote", "category": "remote", "confidence": 0.92, "brand": "Samsung", "model": null}
```

### Judge response text

```json
{
  "status": "present",
  "count_seen": 1,
  "evidence_frame": 1,
  "confidence": 0.96,
  "at_usual_spot": false,
  "where": "on the sofa",
  "reason": "The matching remote is on the sofa."
}
```

The image-array judge sends the reference crop, optional wide context image, and walkthrough frames in that order. It sends `temperature: 0`, parses the JSON response, and retries once when the request fails or the response is not valid JSON. Contract tests mock both the Meta-compatible text input and the VLM image-array request formats.

## Live-provider verification

No live-provider smoke test or real-video accuracy evaluation has been recorded yet. Before relying on a provider, run the opt-in smoke test with real sample images and credentials:

```powershell
python scripts/try_models.py --image path\to\sample.jpg
python scripts/try_models.py --image path\to\sample.jpg `
  --judge-reference path\to\reference.jpg `
  --judge-context path\to\wide-baseline.jpg `
  --judge-frame path\to\walkthrough-frame-1.jpg `
  --judge-frame path\to\walkthrough-frame-2.jpg
```

The judge call costs provider usage. The script exits non-zero if any requested model call fails. Record sanitized request/response notes here, with date, configured model IDs, provider, rate limits, image-count limits, and cost. Never save credentials or private property imagery in this document.

| Verification | Status |
|---|---|
| Client request/response contract tests | Automated; mocked HTTP |
| Live segmentation, labeling, candidate, and guide calls | Not recorded |
| Live multi-image judge call | Not recorded |
| Rate limits and credit budget | Not recorded |
| Real-video accuracy | Pending the labeled dataset in `backend/accuracy/manifest.csv` |
