import hmac
import logging
from typing import Annotated

from fastapi import Header, HTTPException, status

from app.config import settings

logger = logging.getLogger(__name__)


async def require_api_key(
    x_api_key: Annotated[str | None, Header()] = None,
) -> None:
    expected_key = settings.api_key
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API Key no configurada en el servidor (RESTIQUE_API_KEY o API_KEY requerida).",
        )

    if not x_api_key or not hmac.compare_digest(x_api_key.strip(), expected_key.strip()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key inválida o no proporcionada.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
