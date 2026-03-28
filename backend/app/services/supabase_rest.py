from typing import Any, Literal

import httpx

from app.config import settings


class SupabaseRestError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


Prefer = Literal["return=representation", "return=minimal"]


def _headers(access_token: str | None = None, prefer: Prefer | None = None) -> dict[str, str]:
    headers: dict[str, str] = {
        "apikey": settings.supabase_anon_key,
        "Content-Type": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    if prefer:
        headers["Prefer"] = prefer
    return headers


async def rest_get(path: str, *, access_token: str, params: dict[str, str] | None = None) -> Any:
    url = f"{settings.supabase_url}/rest/v1/{path}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(url, headers=_headers(access_token), params=params)

    if resp.status_code >= 400:
        raise SupabaseRestError(resp.text, resp.status_code)
    return resp.json()


async def rest_post(
    path: str,
    *,
    access_token: str,
    json: Any,
    prefer: Prefer = "return=representation",
) -> Any:
    url = f"{settings.supabase_url}/rest/v1/{path}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(url, headers=_headers(access_token, prefer), json=json)

    if resp.status_code >= 400:
        raise SupabaseRestError(resp.text, resp.status_code)
    if resp.text:
        return resp.json()
    return None


async def rest_delete(path: str, *, access_token: str) -> None:
    url = f"{settings.supabase_url}/rest/v1/{path}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.delete(url, headers=_headers(access_token, "return=minimal"))

    if resp.status_code >= 400:
        raise SupabaseRestError(resp.text, resp.status_code)

