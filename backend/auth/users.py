
import re

from backend.config import USERS_FILE
from backend.storage import read_json


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def load_users():
    """
    Load all registered users from the JSON file.
    """
    return read_json(USERS_FILE, [])


def public_user(user):
    """
    Return only safe user information.

    Never expose the password hash or salt to the frontend.
    """
    return {
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    }
