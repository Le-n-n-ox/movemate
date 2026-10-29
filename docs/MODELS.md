# MODELS.md (backend owner fills this in on day 1)

Verify each model against the hackathon docs before writing real calls in `backend/app/services/models/meta.py`.

| Model | Used for | Input (URL / base64 / both) | Video input? | Output shape | Rate limit | Notes |
|---|---|---|---|---|---|---|
| SAM 3.1 | find object regions | | | | | |
| Muse Image | name each crop | | | | | |
| Muse Spark | guest steps, item choice | | | | | |
| Open-weights VLM (Baseten/Modal) | audit judging | | | | | |

## Real request and response examples
(paste one working request and its response for each model)

## Credit budget
- Credits available:
- Estimated cost per baseline photo:
- Estimated cost per audit room:

## Decisions
- Segmentation on video: tracking mode available? yes/no. (Skeleton assumes NO and works either way.)
- Judge model used: Meta reasoning model / Baseten VLM.
