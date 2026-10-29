# MODELS.md (backend owner fills this in on day 1)

Verify each model against the hackathon docs before writing real calls in `backend/app/services/models/meta.py`.

| Model | Used for | Input (URL / base64 / both) | Video input? | Output shape | Rate limit | Notes |
|---|---|---|---|---|---|---|
| SAM 3.1 | find object regions | base64 image | No | List of {bbox: [x,y,w,h], score, polygon} in pixels | | Boxes returned in pixels, normalized to 0..1 |
| Muse Image | name each crop | base64 image | No | {label, category, confidence, brand?, model?} | | Extracts brand/model when visible |
| Muse Spark | guest steps, item choice | base64 image + prompt | No | {label}, {title, steps, warnings, seen, unsure} | | Used for guide() and choose_candidate() |
| Open-weights VLM (Baseten/Modal) | audit judging | base64 images + prompt | No | {status, count_seen, evidence_frame, confidence, where?, at_usual_spot?, reason} | | Fallback for judge() |

## Real request and response examples

### SAM 3.1 segmentation (mocked)
```json
{
  "segments": [
    {"bbox": [120, 250, 80, 100], "score": 0.95, "polygon": [[120,250],[200,250],[200,350],[120,350]]},
    {"bbox": [300, 400, 50, 40], "score": 0.90},
    {"bbox": [500, 200, 60, 110], "score": 0.88}
  ]
}
```

### Muse Image labeling
```json
// Request
{
  "model": "muse-image",
  "temperature": 0,
  "messages": [{"role": "user", "content": [{"type": "image", "data": "base64..."}, {"type": "text", "text": "Identify..."}]}]
}

// Response (extracted text)
{"label": "Samsung TV remote", "category": "remote", "confidence": 0.92, "brand": "Samsung", "model": null}
```

## Credit budget
- Credits available: TBD
- Estimated cost per baseline photo: TBD
- Estimated cost per audit room: TBD

## Decisions
- Segmentation on video: tracking mode available? TBD (Skeleton assumes NO and works either way.)
- Judge model used: Meta reasoning model (default) or Baseten VLM (when VISION_LLM_URL set)

## Implementation Notes

### segment() - Pixel to normalized conversion
SAM 3.1 returns bounding boxes in pixel coordinates [x, y, w, h]. The segment() method in meta.py normalizes these to 0..1 range:
```
normalized_x = pixel_x / image_width
normalized_y = pixel_y / image_height
normalized_w = pixel_w / image_width
normalized_h = pixel_h / image_height
```

### label() - Brand/model extraction
The prompt explicitly asks for brand and model fields when visible. These are extracted and returned in the Label dataclass:
- `brand`: The brand name (e.g., "Samsung", "Nespresso") or null
- `model`: The model name (e.g., "Vertuo Plus") or null
- If not visible, both fields are null

### Mock mode fallback
When MOCK_MODELS=true (default), the MockClient provides deterministic fake responses. The NAMES table includes mock brand/model values for testing:
```python
NAMES = [
    ("Nespresso Vertuo Plus", "appliance", "Nespresso", "Vertuo Plus"),
    ("Samsung TV remote", "remote", "Samsung", None),
    ...
]
```