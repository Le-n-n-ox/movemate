import base64
import json

import httpx
import pytest

from app.config import settings
from app.services.models.meta import MetaClient


def _meta_response(text: str) -> dict:
    return {
        "output": [
            {
                "type": "message",
                "content": [{"type": "output_text", "text": text}],
            }
        ]
    }


def test_segment_normalizes_pixel_boxes(monkeypatch):
    client = MetaClient()
    monkeypatch.setattr(
        client,
        "_post",
        lambda path, body: _meta_response(
            '[{"bbox":[32,24,64,48],"score":0.9}]'
        ),
    )

    segments = client.segment(b"not-needed", height=96, width=128)

    assert len(segments) == 1
    assert segments[0].bbox == {"x": 0.25, "y": 0.25, "w": 0.5, "h": 0.5}
    assert segments[0].score == 0.9


def test_label_candidate_and_guide_parse_provider_responses(monkeypatch):
    client = MetaClient()
    responses = iter(
        [
            '{"label":"Samsung remote","category":"remote","confidence":0.92,'
            '"brand":"Samsung","model":null}',
            '{"choice":2,"confidence":0.88}',
            '{"title":"Use the remote","steps":["Press power"],'
            '"warnings":[],"seen":"power button","unsure":[]}',
        ]
    )
    monkeypatch.setattr(
        client,
        "_post",
        lambda path, body: _meta_response(next(responses)),
    )

    label = client.label(b"crop")
    choice = client.choose_candidate(b"photo", ["TV", "remote"])
    guide = client.guide(b"photo", "remote", "Power button is on top")

    assert (label.label, label.brand, label.confidence) == (
        "Samsung remote",
        "Samsung",
        0.92,
    )
    assert choice == (2, 0.88)
    assert guide.title == "Use the remote"
    assert guide.steps == ["Press power"]


def test_judge_sends_all_images_to_vision_provider_at_zero_temperature(monkeypatch):
    monkeypatch.setattr(settings, "vision_llm_url", "https://vision.example.test")
    monkeypatch.setattr(settings, "vision_llm_key", "test-key")
    payloads = []
    responses = iter(
        [
            {"text": "not JSON"},
            {
                "text": json.dumps(
                    {
                        "status": "present",
                        "count_seen": 1,
                        "evidence_frame": 1,
                        "confidence": 0.96,
                        "at_usual_spot": False,
                        "where": "on the sofa",
                        "reason": "The matching remote is on the sofa.",
                    }
                )
            },
        ]
    )

    def fake_post(url, *, json, headers, timeout):
        payloads.append({"url": url, "json": json, "headers": headers, "timeout": timeout})
        return httpx.Response(
            200,
            json=next(responses),
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr("app.services.models.meta.httpx.post", fake_post)
    client = MetaClient()
    images = [b"reference", b"context", b"frame-one", b"frame-two"]

    result = client.judge(
        images[0],
        images[1],
        images[2:],
        "TV remote",
        1,
        "coffee table",
    )

    assert result.status == "present"
    assert result.where == "on the sofa"
    assert result.at_usual_spot is False
    assert len(payloads) == 2  # Invalid JSON is retried once.
    payload = payloads[-1]
    assert payload["url"] == settings.vision_llm_url
    assert payload["headers"]["Authorization"] == "Api-Key test-key"
    assert payload["json"]["temperature"] == 0
    assert payload["json"]["images"] == [
        base64.b64encode(image).decode() for image in images
    ]
    assert "wide photo showing where the item normally sits" in payload["json"]["prompt"]
    assert "remaining 2 images" in payload["json"]["prompt"]
    assert "IMPORTANT: Return ONLY valid JSON" in payload["json"]["prompt"]


def test_judge_retries_meta_response_with_all_inline_images(monkeypatch):
    monkeypatch.setattr(settings, "vision_llm_url", "")
    client = MetaClient()
    payloads = []
    responses = iter(
        [
            "not JSON",
            '{"status":"not_visible","count_seen":0,"evidence_frame":null,'
            '"confidence":0.4,"at_usual_spot":null,"where":null,"reason":"Blocked."}',
        ]
    )

    def fake_post(path, body):
        payloads.append(body)
        return _meta_response(next(responses))

    monkeypatch.setattr(client, "_post", fake_post)
    images = [b"reference", b"context", b"frame"]

    result = client.judge(images[0], images[1], images[2:], "lamp", 1, None)

    assert result.status == "not_visible"
    assert len(payloads) == 2
    for image in images:
        assert f"data:image/jpeg;base64,{base64.b64encode(image).decode()}" in payloads[1]["input"]
    assert "IMPORTANT: Return ONLY valid JSON" in payloads[1]["input"]


def test_judge_raises_after_invalid_json_retry(monkeypatch):
    monkeypatch.setattr(settings, "vision_llm_url", "")
    client = MetaClient()
    monkeypatch.setattr(
        client,
        "_post",
        lambda path, body: _meta_response("still not JSON"),
    )

    with pytest.raises(ValueError, match="No JSON"):
        client.judge(b"reference", None, [b"frame"], "lamp", 1, None)
