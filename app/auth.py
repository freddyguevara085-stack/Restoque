import hashlib
import hmac
from typing import Annotated

from fastapi import Header, HTTPException, status

from app.config import settings


import time

# IP -> (attempts, lockout_until)
_failed_attempts: dict[str, tuple[int, float]] = {}

def check_rate_limit(ip: str) -> int:
    now = time.time()
    attempts, lockout = _failed_attempts.get(ip, (0, 0.0))
    if now < lockout:
        raise HTTPException(status_code=429, detail="Demasiados intentos. Intente más tarde.")
    return attempts

def record_failed_attempt(ip: str, attempts: int):
    attempts += 1
    lockout = time.time() + 300 if attempts >= 5 else 0.0
    _failed_attempts[ip] = (attempts, lockout)

def clear_attempts(ip: str):
    _failed_attempts.pop(ip, None)


def get_admin_token() -> str:
    ts = str(int(time.time()))
    sig = hmac.new(
        settings.SECRET_KEY.encode(),
        (settings.ADMIN_PIN + ts).encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{ts}.{sig}"


def verify_pin(pin: str) -> bool:
    return hmac.compare_digest(pin.strip(), settings.ADMIN_PIN.strip())


def is_valid_token(token: str) -> bool:
    try:
        ts_str, sig = token.strip().split(".", 1)
        ts = int(ts_str)
        if time.time() - ts > 12 * 3600:
            return False
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode(),
            (settings.ADMIN_PIN + ts_str).encode(),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(sig, expected_sig)
    except Exception:
        return False


async def require_admin(
    authorization: Annotated[str | None, Header()] = None,
):
    if authorization:
        scheme, sep, token = authorization.partition(" ")
        if sep and scheme.strip().lower() == "bearer" and token.strip() and is_valid_token(token):
            return True

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de administrador requerido para esta acción.",
        headers={"WWW-Authenticate": "Bearer"},
    )
