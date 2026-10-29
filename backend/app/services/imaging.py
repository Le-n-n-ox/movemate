import io

from PIL import Image, ImageOps


def open_image(data: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)  # respect phone rotation
    return img.convert("RGB")


def to_jpeg(img: Image.Image, quality: int = 85, max_side: int = 1600) -> bytes:
    img = img.copy()
    img.thumbnail((max_side, max_side))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=quality)
    return buf.getvalue()


def normalize_upload(data: bytes, max_side: int = 1600) -> bytes:
    """Fix rotation and shrink big phone photos before storing or sending to models."""
    return to_jpeg(open_image(data), max_side=max_side)


def crop_bbox(data: bytes, bbox: dict, pad: float = 0.02) -> bytes:
    img = open_image(data)
    W, H = img.size
    x0 = max(0.0, bbox["x"] - pad)
    y0 = max(0.0, bbox["y"] - pad)
    x1 = min(1.0, bbox["x"] + bbox["w"] + pad)
    y1 = min(1.0, bbox["y"] + bbox["h"] + pad)
    box = (int(x0 * W), int(y0 * H), max(int(x0 * W) + 1, int(x1 * W)), max(int(y0 * H) + 1, int(y1 * H)))
    return to_jpeg(img.crop(box), max_side=800)
