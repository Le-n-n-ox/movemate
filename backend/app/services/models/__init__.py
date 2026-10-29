from ...config import settings
from .base import VisionClient


def get_client() -> VisionClient:
    if settings.mock_models:
        from .mock import MockClient
        return MockClient()
    from .meta import MetaClient
    return MetaClient()
