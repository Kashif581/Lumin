
import csv
import os

from backend.config import NAMES
from backend.storage import read_json
from backend.services.statistics import calculate_statistics


def find_first(candidates):
    """Return the first existing path from a list of candidates."""
    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return os.path.abspath(candidate)

    return ""


def load_run(key, recordings_dir):
    """Load one controller's simulation recording."""

    run_dir = os.path.join(recordings_dir, key)
    csv_path = os.path.join(run_dir, "metrics.csv")

    if not os.path.exists(csv_path):
        return None

    meta = read_json(os.path.join(run_dir, "meta.json"), {})

    step_length = float(meta.get("step_length", 0.1))
    frame_every = int(meta.get("frame_every", 5))

    rows = []

    with open(csv_path, newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            try:
                rows.append({
                    "step": int(row["step"]),
                    "q": int(row["total_queue"]),
                    "h": int(row["halting"]),
                    "inNet": int(row["in_network"]),
                    "arrived": int(row["arrived_total"]),
                    "cum": float(row["cumulative_reward"]),
                    "phase": int(row["phase"]),
                    "action": int(row["action"]),
                })

            except (KeyError, ValueError):
                continue

    if not rows:
        return None

    # Count saved simulation frames, if available.
    frames_dir = os.path.join(run_dir, "frames")
    number_of_frames = None

    if os.path.isdir(frames_dir):
        number_of_frames = sum(
            1
            for name in os.listdir(frames_dir)
            if name.lower().endswith((".jpg", ".jpeg", ".png"))
        )

    # Select records corresponding to saved frames.
    sampled = [
        row for row in rows
        if row["step"] % frame_every == 0
    ]

    if number_of_frames:
        sampled = sampled[:number_of_frames]

    video_path = os.path.join(run_dir, "video.mp4")
    has_video = os.path.exists(video_path)

    return {
        "key": key,
        "name": meta.get("name", NAMES[key]),

        "video": (
            f"/recordings/{key}/video.mp4"
            if has_video else None
        ),

        "queue": [row["q"] for row in sampled],
        "halting": [row["h"] for row in sampled],
        "cum": [round(row["cum"], 1) for row in sampled],
        "phase": [row["phase"] for row in sampled],
        "arrived": [row["arrived"] for row in sampled],
        "inNet": [row["inNet"] for row in sampled],

        "stats": calculate_statistics(rows, step_length),

        "_meta": {
            "fps": int(meta.get("fps", 20)),
            "frame_every": frame_every,
            "step_length": step_length,
            "seed": meta.get("seed", 42),
        },
    }
