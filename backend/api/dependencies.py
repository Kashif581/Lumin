
from fastapi import HTTPException, Request

from backend.auth.sessions import session_user


def get_current_user(request: Request):
    """
    Get the currently authenticated user from the session cookie.

    This dependency protects endpoints that require authentication.
    """

    token = request.cookies.get("session")

    user = session_user(token)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    return user
