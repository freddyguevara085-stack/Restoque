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
        logger.warning("RESTIQUE_API_KEY is unset; API key authentication is skipped (dev default).")
        return

    if not x_api_key or not hmac.compare_digest(x_api_key.strip(), expected_key.strip()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key inválida o no proporcionada.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
