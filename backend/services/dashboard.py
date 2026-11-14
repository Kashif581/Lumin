
import os

from backend.config import ORDER
from backend.services.cache import get_cached, set_cached
from backend.services.recordings import load_run
from backend.services.demand import load_demand


def load_all(recordings_dir, routes_file):
    """Build the complete dashboard data response."""

    # Build a cache key using file modification times.
    files = []

    for key in ORDER:
        for name in ("metrics.csv", "meta.json", "video.mp4"):
            path = os.path.join(recordings_dir, key, name)

            modified_time = (
                os.path.getmtime(path)
                if os.path.exists(path)
                else 0
            )

            files.append((path, modified_time))

    if routes_file and os.path.exists(routes_file):
        files.append((
            routes_file,
            os.path.getmtime(routes_file)
        ))

    cache_key = tuple(files)

    # Return the previous response if files have not changed.
    cached_data = get_cached(cache_key)

    if cached_data is not None:
        return cached_data

    # Load all available controller recordings.
    runs = []

    for key in ORDER:
        run = load_run(key, recordings_dir)

        if run:
            runs.append(run)

    # Use metadata from the first available controller.
    if runs:
        meta = runs[0]["_meta"]
    else:
        meta = {
            "fps": 20,
            "frame_every": 5,
            "step_length": 0.1,
            "seed": 42,
        }

    # Internal metadata is not needed by the frontend.
    for run in runs:
        run.pop("_meta")

    # Build the final dashboard response.
    result = {
        "fps": meta["fps"],
        "frameEvery": meta["frame_every"],
        "stepLength": meta["step_length"],
        "seed": meta["seed"],
        "runs": runs,
        "demand": load_demand(routes_file),
    }

    set_cached(cache_key, result)

    return result
