import json
import os


def read_json(path, default=None):
    """
    Read a JSON file.

    If the file does not exist or contains invalid JSON,
    return the provided default value.
    """
    if default is None:
        default = {}

    try:
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)

    except (OSError, ValueError):
        return default


def write_json(path, data):
    """
    Write data to a JSON file safely.

    First write to a temporary file, then replace
    the original file.
    """
    directory = os.path.dirname(path)

    if directory:
        os.makedirs(directory, exist_ok=True)

    temporary_path = path + ".tmp"

    with open(temporary_path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)

    os.replace(temporary_path, path)
