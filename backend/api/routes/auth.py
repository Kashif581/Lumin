
import time
from urllib.parse import urlparse

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.config import LOCK, USERS_FILE, SESSION_DAYS
from backend.storage import write_json


from backend.auth.passwords import hash_password, verify_password
from backend.auth.users import load_users, public_user, EMAIL_RE
from backend.auth.sessions import create_session, drop_session

from backend.auth.login_limiter import (
    too_many_failures,
    note_failure,
    clear_failures,
)

from backend.api.schemas.auth import (
    SignupRequest,
    SigninRequest,
)


router = APIRouter(
    prefix="/api",
    tags=["Authentication"]
)


# --------------------------------------------------
# Response helpers
# --------------------------------------------------

def error_response(status_code, message):
    return JSONResponse(
        status_code=status_code,
        content={"error": message}
    )


def session_response(user, token):
    response = JSONResponse(
        content={"user": public_user(user)}
    )

    response.set_cookie(
        key="session",
        value=token,
        max_age=SESSION_DAYS * 86400,
        httponly=True,
        samesite="strict",
        path="/",
        secure=False,  # Set True when deployed with HTTPS.
    )

    return response


# --------------------------------------------------
# Request validation helpers
# --------------------------------------------------

def origin_is_valid(request):
    origin = request.headers.get("Origin")

    if not origin:
        return True

    origin_host = urlparse(origin).netloc
    request_host = request.headers.get("host", "")

    return origin_host == request_host


def validate_origin(request):
    if not origin_is_valid(request):
        return error_response(400, "Bad request")

    return None


# --------------------------------------------------
# Signup
# --------------------------------------------------

@router.post("/signup")
def signup(data: SignupRequest, request: Request):

    invalid_origin = validate_origin(request)

    if invalid_origin:
        return invalid_origin

    # Only the first registered user can sign up.
    with LOCK:

        if load_users():
            return error_response(
                403,
                "Sign up is closed. Please sign in."
            )

        name = data.name.strip()
        email = data.email.strip().lower()
        password = data.password

        if not (1 <= len(name) <= 80):
            return error_response(
                400,
                "Please enter your name."
            )

        if not EMAIL_RE.match(email) or len(email) > 120:
            return error_response(
                400,
                "Please enter a valid email address."
            )

        if len(password) < 8 or len(password) > 200:
            return error_response(
                400,
                "The password must have at least 8 characters."
            )

        algo, salt, password_hash = hash_password(password)

        user = {
            "name": name,
            "email": email,
            "role": "admin",
            "algo": algo,
            "salt": salt,
            "hash": password_hash,
            "created": time.strftime("%Y-%m-%d %H:%M:%S"),
        }

        write_json(USERS_FILE, [user])

    token = create_session(email)

    return session_response(user, token)


# --------------------------------------------------
# Signin
# --------------------------------------------------

@router.post("/signin")
def signin(data: SigninRequest, request: Request):

    invalid_origin = validate_origin(request)

    if invalid_origin:
        return invalid_origin

    ip = request.client.host if request.client else "unknown"

    if too_many_failures(ip):
        return error_response(
            429,
            "Too many tries. Please wait a few minutes."
        )

    email = data.email.strip().lower()
    password = data.password

    user = next(
        (u for u in load_users() if u["email"] == email),
        None
    )

    if not user or not verify_password(user, password):
        note_failure(ip)

        return error_response(
            401,
            "Wrong email or password."
        )

    clear_failures(ip)

    token = create_session(email)

    return session_response(user, token)


# --------------------------------------------------
# Signout
# --------------------------------------------------

@router.post("/signout")
def signout(request: Request):

    invalid_origin = validate_origin(request)

    if invalid_origin:
        return invalid_origin

    token = request.cookies.get("session")

    drop_session(token)

    response = JSONResponse(
        content={"ok": True}
    )

    response.delete_cookie(
        key="session",
        path="/",
        httponly=True,
        samesite="strict",
        secure=False,
    )

    return response
