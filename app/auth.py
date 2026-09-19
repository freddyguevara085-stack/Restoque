import hashlib
import hmac
from typing import Annotated

from fastapi import Header, HTTPException, status

from app.config import settings


def get_admin_token() -> str:
    return hmac.new(
        settings.SECRET_KEY.encode(),
        settings.ADMIN_PIN.encode(),
        hashlib.sha256,
    ).hexdigest()


def verify_pin(pin: str) -> bool:
    return hmac.compare_digest(pin.strip(), settings.ADMIN_PIN.strip())


def is_valid_token(token: str) -> bool:
    return hmac.compare_digest(token.strip(), get_admin_token())


async def require_admin(
    authorization: Annotated[str | None, Header()] = None,
    x_admin_pin: Annotated[str | None, Header()] = None,
):
    if x_admin_pin and verify_pin(x_admin_pin):
        return True

    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        if is_valid_token(token) or verify_pin(token):
            return True

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="PIN de administrador requerido para esta acción.",
        headers={"WWW-Authenticate": "Bearer"},
    )
