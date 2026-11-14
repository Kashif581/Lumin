
import hashlib
import secrets
import time
from backend.config import LOCK, SESSIONS_FILE, SESSION_DAYS
from backend.storage import read_json, write_json
from backend.auth.users import load_users


def create_session(email):
    """
    Create a login session and return its raw token.

    Only the SHA-256 hash of the token is stored in the
    sessions file.
    """
    token = secrets.token_urlsafe(32)

    with LOCK:
        sessions = read_json(SESSIONS_FILE, {})

        now = time.time()

        # Remove expired sessions.
        sessions = {
            key: value
            for key, value in sessions.items()
            if value["exp"] > now
        }

        # Store the token hash instead of the raw token.
        token_hash = hashlib.sha256(
            token.encode()
        ).hexdigest()

        sessions[token_hash] = {
            "email": email,
            "exp": now + SESSION_DAYS * 86400
        }

        write_json(SESSIONS_FILE, sessions)

    return token


def session_user(token):
    """
    Find the user associated with a valid session token.
    """
    if not token:
        return None

    token_hash = hashlib.sha256(
        token.encode()
    ).hexdigest()

    sessions = read_json(SESSIONS_FILE, {})

    session = sessions.get(token_hash)

    if not session or session["exp"] < time.time():
        return None

    for user in load_users():
        if user["email"] == session["email"]:
            return user

    return None


def drop_session(token):
    """
    Delete a session, effectively logging the user out.
    """
    if not token:
        return

    token_hash = hashlib.sha256(
        token.encode()
    ).hexdigest()

    with LOCK:
        sessions = read_json(SESSIONS_FILE, {})

        sessions.pop(token_hash, None)

        write_json(SESSIONS_FILE, sessions)
