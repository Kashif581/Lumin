
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

# here, we are importing routers from different files
# if we put every endpoint in main.py as the project grows, this file becomes difficult to maintain.
# instead, we separate responsibilities:
# auth.py: login and authentication endpoints.
# dashboard.py: Dashboard-related endpoints.
# static.py: frontend and static file serving.
from backend.api.routes.auth import router as auth_router
from backend.api.routes.dashboard import router as dashboard_router
from backend.api.routes.static import router as static_router

# what is an application factory pattern?
# it is a design pattern in which a function creates and returns an application instance.
def create_app(recordings_dir=None, routes_file=None):

    app = FastAPI(
        title="Traffic Dashboard API",
        description="API for the SUMO traffic simulation dashboard",
        version="1.0.0",
    )

    # Application configuration.
    # Here, we are storing application-specific data.
    # e.g suppose our project stores simultion recordings
    # recordings/
    #   fixed/
    #   ql/
    #   dqn/
    # we pass the recording directory when creating the application
    # app = create_app(
    #       recordings_dir="recordings"
    # )
    # Now, any request handler can access it.
    app.state.recordings_dir = recordings_dir
    app.state.routes_file = routes_file

    # --------------------------------------------------
    # Security headers
    # --------------------------------------------------
    # What is middleware?
    # middleware is code that executes during the request-response lifecycle.
    # think it as security checkpoint between the client and our application
    # browser/frontend -> middleware (request processing pipeline) -> FastAPI Endpoint (processes the request) -> middleware (adds security headers to response) -> browser receives response
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):

        response = await call_next(request)

        # Security headers:
        # this header prevents browsers from guessing the content type of a response
        response.headers.setdefault(
            "X-Content-Type-Options",
            "nosniff"
        )

        # this header controls how much referrer information the browser sends when navigating to another resource
        # same-origin means referrer information is sent for same-origin requests but not cross-origin requests.
        response.headers.setdefault(
            "Referrer-Policy",
            "same-origin"
        )

        # this header prevents our website from being embedded inside an iframe.
        # this helps protect against clickjacking attacks.
        response.headers.setdefault(
            "X-Frame-Options",
            "DENY"
        )

        # this header controls which external resources the browser is allowed to load
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
             "img-src 'self' data: https://fastapi.tiangolo.com; "
            "media-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'"
        )

        return response

    # --------------------------------------------------
    # Exception handling
    # --------------------------------------------------

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):

        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail},
            headers=exc.headers,
        )

    # --------------------------------------------------
    # Register API routers
    # --------------------------------------------------
    # This connects the routers to the main FastAPI application
    # imagine our auth.py contains
    # from fastapi import APIRouter

    # router = APIRouter()

    # @router.post("/login")
    # def login():
    #   return {"message": "Login successful"}

    # /login endpoint becomes available once we register its router
    # without registering the router, FastAPI won't include its endpoints
    app.include_router(auth_router)
    app.include_router(dashboard_router)

    # Register static router LAST.
    # Its catch-all route must not intercept API endpoints.
    # imagine our static router contains:
    # @router.get("/{path:path}")
    # def serve_frontend(path: str):
    #    ...

    # this is catch-all route.
    # it can match paths such as 
    # /
    # /dashboard
    # /login
    # /recordings
    # if it is registered before our API routes, it could intercept requests intended for those routes.
    # Registering it last reduces that risk
    app.include_router(static_router)

    return app


# Default application for direct Uvicorn usage.
app = create_app()
