import os
import tempfile
import asyncio
import pytest
from starlette.testclient import TestClient

# Redirect to throwaway SQLite DB before importing application modules
tmp_db_file = os.path.join(tempfile.gettempdir(), "test_restoque_conftest.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{tmp_db_file}"
os.environ["ADMIN_PIN"] = "1234"
os.environ["SECRET_KEY"] = "test-secret-key-00000000000000000000"
os.environ["DEBUG"] = "true"
os.environ["RESTIQUE_API_KEY"] = "restoque-prod-key-2026-super-secure"
os.environ["API_KEY"] = "restoque-prod-key-2026-super-secure"

from app.database import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
def reset_database():
    """Wipe and recreate database schema before each test for complete isolation."""
    async def _reset():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
    asyncio.run(_reset())
    yield


@pytest.fixture
def client():
    with TestClient(app, headers={"X-API-Key": "restoque-prod-key-2026-super-secure"}) as test_client:
        yield test_client


@pytest.fixture
def admin_headers(client):
    res = client.post("/api/auth/verify-pin", json={"pin": "1234"})
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}", "X-API-Key": "restoque-prod-key-2026-super-secure"}
