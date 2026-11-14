
from backend.config import CONGESTED_AT, HIST_EDGES, PHASE_GROUP


def calculate_statistics(rows, step_length):
    """
    Calculate traffic performance statistics from simulation rows.
    """

    n = len(rows)

    if not n:
        return {}

    queues = [row["q"] for row in rows]
    halting = [row["h"] for row in rows]
    sorted_queues = sorted(queues)
    phases = [row["phase"] for row in rows]

    # Count time spent in each traffic-light phase.
    phase_counts = {
        "A_green": 0,
        "B_green": 0,
        "yellow": 0,
        "all_red": 0,
    }

    for phase in phases:
        group = PHASE_GROUP.get(phase, "all_red")
        phase_counts[group] += 1

    # Calculate average duration of green-light phases.
    green_runs = []
    current_phase = None
    current_length = 0

    for phase in phases:
        if phase == current_phase:
            current_length += 1
        else:
            if current_phase in (0, 3):
                green_runs.append(current_length)

            current_phase = phase
            current_length = 1

    # Include the final green phase run.
    if current_phase in (0, 3):
        green_runs.append(current_length)

    average_green = (
        sum(green_runs) / len(green_runs) * step_length
        if green_runs else 0.0
    )

    # Queue length histogram.
    histogram = [0] * len(HIST_EDGES)

    for queue in queues:
        index = 0

        for i, edge in enumerate(HIST_EDGES):
            if queue >= edge:
                index = i

        histogram[index] += 1

    # Average queue length for approximately 100-second windows.
    window_size = max(1, round(100 / step_length))

    windows = []

    for i in range(0, n, window_size):
        window = queues[i:i + window_size]
        windows.append(round(sum(window) / len(window), 2))

    return {
        "steps": n,
        "seconds": round(n * step_length, 1),

        "avgQueue": round(sum(queues) / n, 2),
        "peakQueue": max(queues),
        "p95Queue": sorted_queues[int(0.95 * (n - 1))],

        "avgHalting": round(sum(halting) / n, 2),

        "stoppedShare": round(
            sum(halting) / max(1, sum(queues)) * 100, 1
        ),

        "congestedPct": round(
            sum(1 for value in queues if value >= CONGESTED_AT) / n * 100,
            1
        ),

        "finalReward": round(rows[-1]["cum"], 1),
        "throughput": rows[-1]["arrived"],

        "avgInNetwork": round(
            sum(row["inNet"] for row in rows) / n, 1
        ),

        "switches": sum(
            1 for row in rows if row["action"] == 1
        ),

        "avgGreen": round(average_green, 1),

        "phaseShare": {
            key: round(value / n * 100, 1)
            for key, value in phase_counts.items()
        },

        "hist": [
            round(value / n * 100, 1)
            for value in histogram
        ],

        "windows": windows,
    }
