from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel, Field

from app.auth import get_admin_token, verify_pin, check_rate_limit, record_failed_attempt, clear_attempts

router = APIRouter(prefix="/auth", tags=["Auth"])


class PinRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=12)


class AuthResponse(BaseModel):
    success: bool
    token: str


@router.post("/verify-pin", response_model=AuthResponse)
async def login_with_pin(payload: PinRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    attempts = check_rate_limit(ip)

    if not verify_pin(payload.pin):
        record_failed_attempt(ip, attempts)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PIN incorrecto.",
        )
    clear_attempts(ip)
    return AuthResponse(success=True, token=get_admin_token())
