import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

def test_config_loads():
    """Proves configuration system loads correctly."""
    assert settings.PROJECT_NAME == "The Placement Week Scheduler"
    assert settings.API_V1_STR == "/api/v1"
    assert settings.PORT == 8000

def test_root_endpoint():
    """Proves FastAPI starts and root endpoint returns expected payload."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["docs_url"] == "/docs"

def test_health_check_endpoint():
    """Proves API router works and health check endpoint functions."""
    response = client.get(f"{settings.API_V1_STR}/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["project"] == settings.PROJECT_NAME
    assert "database_connected" in data
