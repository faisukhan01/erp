"""Database connection layer for Buildora.

Works with two engines, chosen by DATABASE_URL:
  - Neon PostgreSQL (production): postgresql://...  -> psycopg 3 driver
  - SQLite (sandbox/dev):           sqlite:///...   -> zero-config local file

Neon setup: create a free database at https://neon.com, copy the pooled
connection string into mini-services/api/.env as DATABASE_URL and restart.
"""
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv(override=True)

_raw_url = (os.getenv("DATABASE_URL") or "").strip()

if _raw_url.startswith("postgresql"):
    # psycopg3 driver for Neon / any modern PostgreSQL
    DATABASE_URL = _raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
    if "pooler" in _raw_url:
        # Neon pooled endpoints dislike prepared statements
        CONNECT_ARGS: dict = {}
        ENGINE_KWARGS = {
            "pool_pre_ping": True,
            "pool_recycle": 280,
            "pool_size": 5,
            "max_overflow": 10,
            "connect_args": {"sslmode": "require", "prepared_statement_cache_size": 0},
        }
    else:
        CONNECT_ARGS = {}
        ENGINE_KWARGS = {"pool_pre_ping": True, "pool_recycle": 280, "pool_size": 5, "max_overflow": 10}
elif _raw_url.startswith("sqlite"):
    DATABASE_URL = _raw_url
    CONNECT_ARGS = {"check_same_thread": False}
    ENGINE_KWARGS = {"connect_args": CONNECT_ARGS}
else:
    # Fallback: local SQLite file so the platform always boots.
    DATABASE_URL = "sqlite:////home/z/my-project/db/buildora.db"
    CONNECT_ARGS = {"check_same_thread": False}
    ENGINE_KWARGS = {"connect_args": CONNECT_ARGS}

engine = create_engine(DATABASE_URL, **ENGINE_KWARGS)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
