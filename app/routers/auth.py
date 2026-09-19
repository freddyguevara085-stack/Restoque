from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import get_admin_token, verify_pin

router = APIRouter(prefix="/auth", tags=["Auth"])


class PinRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=12)


class AuthResponse(BaseModel):
    success: bool
    token: str


@router.post("/verify-pin", response_model=AuthResponse)
async def login_with_pin(payload: PinRequest):
    if not verify_pin(payload.pin):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PIN incorrecto.",
        )
    return AuthResponse(success=True, token=get_admin_token())
