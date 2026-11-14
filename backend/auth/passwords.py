
import hashlib
import hmac
import secrets


def hash_password(password, salt_hex=None, algo=None):
    """
    Create a salted password hash.

    Prefer scrypt. If scrypt is unavailable, use PBKDF2.
    Returns: (algorithm, salt, password_hash)
    """
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)

    if algo in (None, "scrypt"):
        try:
            hashed = hashlib.scrypt(
                password.encode("utf-8"),
                salt=salt,
                n=2 ** 14,
                r=8,
                p=1,
                dklen=32
            )

            return "scrypt", salt.hex(), hashed.hex()

        except (AttributeError, ValueError):
            if algo == "scrypt":
                raise

    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        600_000,
        dklen=32
    )

    return "pbkdf2", salt.hex(), hashed.hex()


def verify_password(user, password):
    """
    Verify a password against the stored user hash.
    """
    _, _, hashed = hash_password(
        password,
        user["salt"],
        user["algo"]
    )

    return hmac.compare_digest(hashed, user["hash"])
