
import os

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse

from backend.config import WEB_DIR
from backend.auth.sessions import session_user

from backend.api.services.video_stream import stream_file


router = APIRouter(tags=["Static Files"])


def serve_frontend_file(path, request, content_type=None, cache="no-cache"):
    """
    Serve a frontend file.
    """

    return stream_file(
        path=path,
        request=request,
        content_type=content_type,
        cache=cache
    )


def handle_frontend_request(file_path, request):
    """
    Serve static frontend files or fall back to React index.html.
    """

    relative_path = file_path.lstrip("/")

    full_path = os.path.abspath(
        os.path.join(WEB_DIR, relative_path)
    )

    web_root = os.path.abspath(WEB_DIR)

    # Prevent directory traversal outside the web folder.
    try:
        inside_web = (
            os.path.commonpath([web_root, full_path])
            == web_root
        )
    except ValueError:
        inside_web = False

    if not inside_web:
        return JSONResponse(
            status_code=404,
            content={"error": "Not found"}
        )

    # Serve an existing frontend file.
    if os.path.isfile(full_path):

        cache = (
            "public, max-age=31536000, immutable"
            if "/assets/" in request.url.path
            else "no-cache"
        )

        return FileResponse(
            full_path,
            headers={
                "Cache-Control": cache,
                "Accept-Ranges": "bytes"
            }
        )

    # Missing files should return 404 instead of index.html.
    if "." in os.path.basename(relative_path):
        return JSONResponse(
            status_code=404,
            content={"error": "Not found"}
        )

    # React Single Page Application fallback.
    index_path = os.path.join(WEB_DIR, "index.html")

    if not os.path.isfile(index_path):
        return JSONResponse(
            status_code=500,
            content={
                "error": "The 'web' folder is missing index.html"
            }
        )

    return serve_frontend_file(
        index_path,
        request,
        content_type="text/html; charset=utf-8"
    )


@router.api_route(
    "/recordings/{controller}/video.mp4",
    methods=["GET", "HEAD"]
)
def get_video(controller: str, request: Request):

    if controller not in ("fixed", "ql", "dqn"):
        return JSONResponse(
            status_code=404,
            content={"error": "Not found"}
        )

    # Preserve the old authentication behavior.
    token = request.cookies.get("session")
    user = session_user(token)

    if not user:
        return JSONResponse(
            status_code=401,
            content={"error": "Please sign in"}
        )

    recordings_dir = request.app.state.recordings_dir

    if not recordings_dir:
        return JSONResponse(
            status_code=404,
            content={"error": "Not found"}
        )

    video_path = os.path.join(
        recordings_dir,
        controller,
        "video.mp4"
    )

    return stream_file(
        path=video_path,
        request=request,
        content_type="video/mp4"
    )


@router.api_route("/", methods=["GET", "HEAD"])
def serve_home(request: Request):
    return handle_frontend_request("", request)


@router.api_route("/{file_path:path}", methods=["GET", "HEAD"])
def serve_frontend(file_path: str, request: Request):

    return handle_frontend_request(
        file_path,
        request
    )
