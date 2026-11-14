
import os
import xml.etree.ElementTree as ET

from backend.config import APPROACH, TURN


def load_demand(routes_file):
    """Read SUMO route XML and calculate traffic demand."""

    if not routes_file or not os.path.exists(routes_file):
        return None

    try:
        root = ET.parse(routes_file).getroot()
    except ET.ParseError:
        return None

    approaches = {}

    roads = {
        "A": 0.0,
        "B": 0.0,
    }

    turns = {
        "straight": 0.0,
        "right": 0.0,
        "left": 0.0,
    }

    total = 0.0

    for flow in root.iter("flow"):
        source = flow.get("from")
        destination = flow.get("to")
        vehicles_per_hour = flow.get("vehsPerHour")

        if source not in APPROACH or vehicles_per_hour is None:
            continue

        try:
            volume = float(vehicles_per_hour)
        except ValueError:
            continue

        direction, road = APPROACH[source]

        approach = approaches.setdefault(
            direction,
            {
                "id": direction,
                "edge": source,
                "road": road,
                "vehPerHour": 0.0,
            }
        )

        approach["vehPerHour"] += volume
        roads[road] += volume

        movement = TURN.get(
            (source, destination),
            "straight"
        )

        turns[movement] += volume
        total += volume

    if not total:
        return None

    return {
        "approaches": sorted(
            approaches.values(),
            key=lambda item: item["id"]
        ),
        "roads": roads,
        "turns": turns,
        "total": total,
    }
