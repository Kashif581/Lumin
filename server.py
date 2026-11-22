
#!/usr/bin/env python3

"""
Traffic Signal Optimization - Dashboard Server.

Responsibilities:
- Read command-line arguments.
- Discover recordings and SUMO route files.
- Validate frontend build.
- Configure the FastAPI application.
- Start the Uvicorn server.
"""

import argparse
import os
import sys
import threading
import webbrowser

import uvicorn

from backend.config import (
    BASE_DIR,
    WEB_DIR,
    RECORDINGS_DIR,
    SUMO_ROUTES_FILE,
    ORDER,
    NAMES,
)

from backend.services.recordings import find_first
from backend.api.main import create_app


# --------------------------------------------------
# Resource discovery
# --------------------------------------------------

def discover_recordings(args):
    """
    Find the recordings directory.

    Priority:
    1. User-provided directory.
    2. Default project recordings directory.
    """

    recordings_dir = find_first([
        args.recordings,
        RECORDINGS_DIR,
        os.path.join(BASE_DIR, "recordings"),
    ])

    if not recordings_dir:
        recordings_dir = RECORDINGS_DIR

        print(
            "Note: no recordings folder found yet. "
            "Record a simulation run first."
        )

    return recordings_dir


def discover_routes(args):
    """
    Find the SUMO route XML file.

    Priority:
    1. User-provided route file.
    2. Default simulation configuration file.
    """

    routes_file = find_first([
        args.routes,
        SUMO_ROUTES_FILE,
    ])

    return routes_file


# --------------------------------------------------
# Frontend validation
# --------------------------------------------------

def check_frontend():
    """
    Ensure the production frontend build exists.
    """

    index_path = os.path.join(
        WEB_DIR,
        "index.html"
    )

    if not os.path.isfile(index_path):
        sys.exit(
            f"Frontend build not found: {index_path}\n"
            "Make sure the frontend is built and "
            "the web folder exists."
        )


# --------------------------------------------------
# Dashboard information
# --------------------------------------------------

def display_dashboard_info(recordings_dir, routes_file):
    """
    Display available controllers and discovered resources.
    """

    found = [
        key
        for key in ORDER
        if os.path.isfile(
            os.path.join(
                recordings_dir,
                key,
                "metrics.csv"
            )
        )
    ]

    print("\n========== Traffic Signal Optimization ==========\n")

    print(f"Project directory : {BASE_DIR}")
    print(f"Recordings folder : {recordings_dir}")

    print(
        "Controllers found : "
        + (", ".join(NAMES[key] for key in found) or "none yet")
    )

    print(
        f"Demand file       : "
        f"{routes_file or 'not found (demand charts will be hidden)'}"
    )

    print("\n=================================================\n")


# --------------------------------------------------
# Application entry point
# --------------------------------------------------

def main():

    # 1. Read command-line arguments

    parser = argparse.ArgumentParser(
        description="Traffic Signal Optimization Dashboard"
    )

    parser.add_argument(
        "--recordings",
        help="Custom recordings directory"
    )

    parser.add_argument(
        "--routes",
        help="Custom SUMO route XML file"
    )

    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Server host (use 0.0.0.0 for network access)"
    )

    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Server port"
    )

    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Do not automatically open browser"
    )

    args = parser.parse_args()

    # 2. Discover recordings

    recordings_dir = discover_recordings(args)

    # 3. Discover SUMO routes

    routes_file = discover_routes(args)

    # 4. Validate frontend build

    check_frontend()

    # 5. Display discovered resources

    display_dashboard_info(
        recordings_dir,
        routes_file
    )

    # 6. Create FastAPI application

    app = create_app(
        recordings_dir=recordings_dir,
        routes_file=routes_file
    )

    # 7. Prepare server URLs

    browser_host = (
        "localhost"
        if args.host in ("127.0.0.1", "0.0.0.0")
        else args.host
    )

    url = f"http://{browser_host}:{args.port}/"
    docs_url = f"{url}docs"

    print(f"Dashboard URL     : {url}")
    print(f"API documentation: {docs_url}")
    print("\nPress Ctrl+C to stop the server.")

    if args.host == "0.0.0.0":
        print(
            "\nWarning: other computers on your network "
            "may access this server."
        )

    # 8. Open browser

    if not args.no_browser:
        threading.Timer(
            0.8,
            lambda: webbrowser.open(url)
        ).start()

    # 9. Start Uvicorn

    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
