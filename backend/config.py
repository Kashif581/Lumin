
import os
import threading


# --------------------------------------------------
# Project paths
# --------------------------------------------------

# Project root: Lumin/
BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

# Main directories
BACKEND_DIR = os.path.join(BASE_DIR, "backend") # Lumin/backend
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend") # Lumin/backend
WEB_DIR = os.path.join(BASE_DIR, "web") # Lumin/web
DATA_DIR = os.path.join(BASE_DIR, "data") # Lumin/data
RECORDINGS_DIR = os.path.join(BASE_DIR, "recordings") # Lumin/recordings

# Simulation directories
SIMULATION_DIR = os.path.join(BASE_DIR, "simulation")
SIMULATION_SCRIPTS_DIR = os.path.join(SIMULATION_DIR, "scripts")
SIMULATION_CONFIG_DIR = os.path.join(SIMULATION_DIR, "config")
SIMULATION_MODELS_DIR = os.path.join(SIMULATION_DIR, "models")
SIMULATION_ASSETS_DIR = os.path.join(SIMULATION_DIR, "assets")


# --------------------------------------------------
# Data storage paths
# --------------------------------------------------

# These variables represent the locations of our JSON files
USERS_FILE = os.path.join(DATA_DIR, "users.json")
SESSIONS_FILE = os.path.join(DATA_DIR, "sessions.json")


# --------------------------------------------------
# Simulation configuration files
# --------------------------------------------------

SUMO_CONFIG_FILE = os.path.join(
    SIMULATION_CONFIG_DIR, "RL.sumocfg"
)

SUMO_ROUTES_FILE = os.path.join(
    SIMULATION_CONFIG_DIR, "RL.rou.xml"
)

NETWORK_FILE = os.path.join(
    SIMULATION_CONFIG_DIR, "RL.net.xml"
)

ADDITIONAL_FILE = os.path.join(
    SIMULATION_CONFIG_DIR, "RL.add.xml"
)

VIEW_FILE = os.path.join(
    SIMULATION_CONFIG_DIR, "RL.view.xml"
)

DQN_MODEL_FILE = os.path.join(
    SIMULATION_MODELS_DIR, "dqn_traffic.keras"
)

Q_TABLE_FILE = os.path.join(
    SIMULATION_MODELS_DIR, "q_table.pkl"
)


# --------------------------------------------------
# Dashboard configuration
# --------------------------------------------------

# defining the order in which traffic controllers should appear
ORDER = ["fixed", "ql", "dqn"]

NAMES = {
    "fixed": "Fixed timing",
    "ql": "Q-learning",
    "dqn": "Deep Q-learning (DQN)",
}

# this define session duration
SESSION_DAYS = 7

# A queue of 10 or more vehicles is considered congested.
CONGESTED_AT = 10

# Queue histogram bands:
# 0-2, 3-5, 6-8, 9-11, 12-14, 15+
HIST_EDGES = [0, 3, 6, 9, 12, 15]

PHASE_GROUP = {
    0: "B_green",
    3: "A_green",
    1: "yellow",
    4: "yellow",
    2: "all_red",
    5: "all_red",
}


# --------------------------------------------------
# Road network configuration
# --------------------------------------------------

# Edge ID: (compass direction, road)
# This maps SUMO edge IDs to their corresponding directions and roads
APPROACH = {
    "E9": ("NW", "A"),
    "E10": ("SE", "A"),
    "E5": ("NE", "B"),
    "E6": ("SW", "B"),
}

# (incoming edge, outgoing edge): movement
# maps incoming and outgoing edges to vehicle movements.
TURN = {
    ("E9", "E11"): "straight",
    ("E10", "E8"): "straight",
    ("E5", "E7"): "straight",
    ("E6", "E4"): "straight",

    ("E10", "E4"): "right",
    ("E5", "E8"): "right",
    ("E6", "E11"): "right",
    ("E9", "E7"): "right",

    ("E9", "E4"): "left",
    ("E10", "E7"): "left",
    ("E5", "E11"): "left",
    ("E6", "E8"): "left",
}


# --------------------------------------------------
# Runtime state
# --------------------------------------------------

# Populated when the server starts.
# a mutable variable intended to hold the active recordings location
RECORDINGS = ""

# a mutable variable intended to hold the active route-file location.
RUNTIME_ROUTES_FILE = ""

# Shared lock for thread-safe operations.
LOCK = threading.Lock()
