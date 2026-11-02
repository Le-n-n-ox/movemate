# MODELS.md (backend owner fills this in on day 1)

Verify each model against the hackathon docs before writing real calls in `backend/app/services/models/meta.py`.

## Configuration

- **API base URL**: `https://api.meta.ai/v1`
- **Auth**: `Authorization: Bearer <META_API_KEY>`
- **Endpoint**: `POST /responses` (appended to `meta_api_base` which already includes `/v1`)
- **Image format**: `data:image/jpeg;base64,... <prompt text>` as a single string in `input`
- **Response envelope**: `{"output": [{"type": "reasoning", "summary": [{"type": "summary_text", "text": "..."}]}]}`
- **Model names**: `muse-image-1.0`, `muse-spark-1.3`, `sam-3.1`, `muse-wonder-1.0`

| Model | Used for | Input | Video input? | Output shape | Rate limit | Notes |
|---|---|---|---|---|---|---|
| SAM 3.1 | find object regions | base64 image | No | List of {bbox: [x,y,w,h], score, polygon} in pixels | | Boxes returned in pixels, normalized to 0..1 |
| Muse Image | name each crop | base64 image | No | {label, category, confidence, brand?, model?} | | Extracts brand/model when visible |
| Muse Spark | guest steps, item choice | base64 image + prompt | No | {label}, {title, steps, warnings, seen, unsure} | | Used for guide() and choose_candidate() |
| Open-weights VLM (Baseten/Modal) | audit judging | base64 images + prompt | No | {status, count_seen, evidence_frame, confidence, where?, at_usual_spot?, reason} | | Fallback for judge() |

## Real request and response examples

Verified against the live Meta API at `https://api.meta.ai/v1/responses`.

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

### Muse Image labeling — /responses request
```json
{
  "model": "muse-image-1.0",
  "input": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD... Identify the single main object in this image. Return JSON only: {\"label\": \"...\", \"category\": \"...\", \"confidence\": <0 to 1>, \"brand\": null, \"model\": null}"
}
```

### Muse Image labeling — response (extracted text)
```json
{"label": "Samsung TV remote", "category": "remote", "confidence": 0.92, "brand": "Samsung", "model": null}
```

### Muse Spark — text-only /v1/responses request
```json
{
  "model": "muse-spark-1.3",
  "input": "Say hello in plain text, no emoji."
}
```

### Muse Spark — response
```json
{"model": "muse-spark-1.3", "id": "resp_6ae853a5ffc2ebfdb3b5439a", "object": "response", "status": "completed", "output": [{"type": "reasoning", "summary": [{"type": "summary_text", "text": "Hello"}]}]}
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

### Response envelope parsing
The /v1/responses endpoint returns an envelope with an `output` array. Each output item has a `type`:
- `message`: contains `content` array with `output_text` items
- `reasoning`: contains `summary` array with `summary_text` items

Extract text by concatenating all `output_text` and `summary_text` values.

### Mock mode fallback
When MOCK_MODELS=true (default), the MockClient provides deterministic fake responses. The NAMES table includes mock brand/model values for testing:
```python
NAMES = [
    ("Nespresso Vertuo Plus", "appliance", "Nespresso", "Vertuo Plus"),
    ("Samsung TV remote", "remote", "Samsung", None),
    ...
]
```