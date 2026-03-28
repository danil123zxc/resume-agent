from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException

from app.services.supabase_auth import AuthError, get_user_from_access_token


@dataclass(frozen=True)
class UserContext:
    user_id: str
    access_token: str


async def require_user(authorization: str | None = Header(default=None)) -> UserContext:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization bearer token")

    access_token = authorization.split(" ", 1)[1].strip()
    try:
        user = await get_user_from_access_token(access_token)
    except AuthError:
        raise HTTPException(status_code=401, detail="Invalid access token")

    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user payload")

    return UserContext(user_id=user_id, access_token=access_token)

