
import mimetypes
import os
import re

from fastapi.responses import Response, StreamingResponse


CHUNK_SIZE = 65536


def parse_range(range_header, file_size):
    """
    Parse a single HTTP byte range.

    Examples:
        bytes=0-100
        bytes=100-
        bytes=-500

    Returns:
        (start, end, status_code)
    """

    start = 0
    end = file_size - 1
    status_code = 200

    if not range_header:
        return start, end, status_code

    match = re.fullmatch(
        r"bytes=(\d*)-(\d*)",
        range_header.strip()
    )

    # Ignore malformed or unsupported ranges.
    if not match:
        return start, end, status_code

    first, last = match.groups()

    if not first and not last:
        return start, end, status_code

    if not first:
        # Suffix range: bytes=-500
        suffix_length = int(last)
        start = max(0, file_size - suffix_length)
    else:
        start = int(first)

        if last:
            end = min(file_size - 1, int(last))

    # Requested range is outside the file.
    if start > end or start >= file_size:
        return None, None, 416

    status_code = 206

    return start, end, status_code


def stream_file(path, request, content_type=None, cache="no-cache"):
    """
    Stream a file while supporting HTTP Range requests.
    """

    try:
        file_size = os.path.getsize(path)
    except OSError:
        return Response(
            content='{"error":"Not found"}',
            status_code=404,
            media_type="application/json",
            headers={"Cache-Control": "no-store"}
        )

    range_header = request.headers.get("range")

    start, end, status_code = parse_range(
        range_header,
        file_size
    )

    if status_code == 416:
        return Response(
            status_code=416,
            headers={
                "Content-Range": f"bytes */{file_size}",
                "Content-Length": "0",
                "Accept-Ranges": "bytes",
                "Cache-Control": cache,
            }
        )

    length = end - start + 1

    media_type = (
        content_type
        or mimetypes.guess_type(path)[0]
        or "application/octet-stream"
    )

    headers = {
        "Content-Type": media_type,
        "Content-Length": str(length),
        "Accept-Ranges": "bytes",
        "Cache-Control": cache,
    }

    if status_code == 206:
        headers["Content-Range"] = (
            f"bytes {start}-{end}/{file_size}"
        )

    # HEAD requests return headers without a response body.
    if request.method == "HEAD":
        return Response(
            status_code=status_code,
            headers=headers
        )

    def generate_file():
        """
        Read the file in small chunks instead of loading
        the entire video into memory.
        """

        try:
            with open(path, "rb") as file:
                file.seek(start)

                remaining = length

                while remaining > 0:
                    chunk = file.read(
                        min(CHUNK_SIZE, remaining)
                    )

                    if not chunk:
                        break

                    remaining -= len(chunk)

                    yield chunk

        except (
            BrokenPipeError,
            ConnectionResetError,
            ConnectionAbortedError
        ):
            # Client disconnected or stopped playback.
            return

    return StreamingResponse(
        generate_file(),
        status_code=status_code,
        headers=headers
    )
