import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# 1. Sync Database Configuration (psycopg2)
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
if SQLALCHEMY_DATABASE_URL.startswith("postgresql+asyncpg://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 2. Async Database Configuration (asyncpg) - Lazy Initialization
_async_engine = None
_AsyncSessionLocal = None

def get_async_engine():
    global _async_engine
    if _async_engine is None:
        from sqlalchemy.ext.asyncio import create_async_engine
        async_url = settings.DATABASE_URL
        if async_url.startswith("postgresql://"):
            async_url = async_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif async_url.startswith("postgres://"):
            async_url = async_url.replace("postgres://", "postgresql+asyncpg://", 1)
        _async_engine = create_async_engine(async_url, pool_pre_ping=True, echo=False)
    return _async_engine

def get_async_sessionmaker():
    global _AsyncSessionLocal
    if _AsyncSessionLocal is None:
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
        engine_inst = get_async_engine()
        _AsyncSessionLocal = async_sessionmaker(
            bind=engine_inst,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False
        )
    return _AsyncSessionLocal

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_async_db():
    session_factory = get_async_sessionmaker()
    async with session_factory() as session:
        yield session

def check_db_connection() -> bool:
    """Verifies synchronous database connectivity."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

async def check_async_db_connection() -> bool:
    """Verifies asynchronous database connectivity."""
    try:
        engine_inst = get_async_engine()
        async with engine_inst.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
