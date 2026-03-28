from typing import Any

import httpx

from app.config import settings


class AuthError(Exception):
    pass


async def get_user_from_access_token(access_token: str) -> dict[str, Any]:
    url = f"{settings.supabase_url}/auth/v1/user"
    headers = {
        "apikey": settings.supabase_anon_key,
        "Authorization": f"Bearer {access_token}",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code != 200:
        raise AuthError("Invalid or expired access token")

    return resp.json()

