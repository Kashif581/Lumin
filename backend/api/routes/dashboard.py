
from fastapi import APIRouter, Depends, Request

from backend.api.dependencies import get_current_user

from backend.auth.sessions import session_user
from backend.auth.users import load_users, public_user

from backend.services.dashboard import load_all


router = APIRouter(
    prefix="/api",
    tags=["Dashboard"]
)


@router.get("/status")
def get_status(request: Request):
    """
    Public endpoint that checks application and authentication status.
    """

    token = request.cookies.get("session")
    user = session_user(token)

    return {
        "hasAdmin": bool(load_users()),
        "authenticated": bool(user),
        "user": public_user(user) if user else None
    }


@router.get("/runs")
def get_runs(
    request: Request,
    user=Depends(get_current_user)
):
    """
    Return simulation results to authenticated users.
    """

    return load_all(
        request.app.state.recordings_dir,
        request.app.state.routes_file
    )
