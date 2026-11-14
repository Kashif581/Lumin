
# Stores the most recently calculated dashboard response.

_cache = {
    "key": None,
    "value": None,
}


def get_cached(key):
    """Return cached data if the key matches."""
    if _cache["key"] == key:
        return _cache["value"]

    return None


def set_cached(key, value):
    """Save the latest dashboard response."""
    _cache["key"] = key
    _cache["value"] = value
