"""Matching helpers: dedupe objects across frames, rank candidates, shortlist frames."""
from difflib import SequenceMatcher


def iou(a: dict, b: dict) -> float:
    x1, y1 = max(a["x"], b["x"]), max(a["y"], b["y"])
    x2, y2 = min(a["x"] + a["w"], b["x"] + b["w"]), min(a["y"] + a["h"], b["y"] + b["h"])
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    union = a["w"] * a["h"] + b["w"] * b["h"] - inter
    return inter / union if union > 0 else 0.0


def area(b: dict) -> float:
    return b["w"] * b["h"]


def label_sim(a: str, b: str) -> float:
    a, b = a.lower().strip(), b.lower().strip()
    if not a or not b:
        return 0.0
    ta, tb = set(a.split()), set(b.split())
    jacc = len(ta & tb) / len(ta | tb) if ta | tb else 0.0
    return max(jacc, SequenceMatcher(None, a, b).ratio())


def rank_candidates(labels: list[str], target: str, top: int = 5) -> list[int]:
    """Indices of labels, best match first."""
    scored = sorted(range(len(labels)), key=lambda i: label_sim(labels[i], target), reverse=True)
    return scored[:top]


def dedupe(objs: list[dict]) -> list[dict]:
    """Keep distinct same-label objects while merging detections across frames."""
    groups: list[list[dict]] = []
    for o in objs:
        label = o["label"].strip().casefold()
        candidates = []
        for g in groups:
            if any(member["label"].strip().casefold() != label for member in g):
                continue
            if any(member["frame"] == o["frame"] for member in g):
                continue
            overlap = max(iou(member["bbox"], o["bbox"]) for member in g)
            if overlap > 0.15:
                candidates.append((overlap, g))
        if candidates:
            max(candidates, key=lambda match: match[0])[1].append(o)
        else:
            groups.append([o])
    out = []
    for g in groups:
        best = max(g, key=lambda x: x["conf"])
        out.append({**best})
    return out


def shortlist_frames(frame_labels: list[list[str]], item_label: str, k: int = 4) -> list[int]:
    """Pick the k frames whose observed labels best match the item. Fall back to evenly spaced frames."""
    n = len(frame_labels)
    if n == 0:
        return []
    scores = [max((label_sim(l, item_label) for l in labs), default=0.0) for labs in frame_labels]
    ranked = [i for i in sorted(range(n), key=lambda i: scores[i], reverse=True) if scores[i] >= 0.5][:k]
    if ranked:
        return sorted(ranked)
    return even_spread(n, k)


def even_spread(n: int, k: int = 4) -> list[int]:
    if n <= k:
        return list(range(n))
    return sorted({round(i * (n - 1) / (k - 1)) for i in range(k)})
