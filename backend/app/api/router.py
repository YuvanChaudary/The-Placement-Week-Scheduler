from fastapi import APIRouter
from app.core.config import settings
from app.core.database import check_db_connection
from app.api.schedules import router as schedules_router
from app.api.replans import router as replans_router
from app.api.entities import router as entities_router

api_router = APIRouter(prefix=settings.API_V1_STR)

@api_router.get("/health", summary="System Health Check")
def health_check():
    db_status = check_db_connection()
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database_connected": db_status
    }

api_router.include_router(schedules_router, tags=["Schedules & Metrics"])
api_router.include_router(replans_router, tags=["Replanning Engine"])
api_router.include_router(entities_router, tags=["Entities & Master Data"])
