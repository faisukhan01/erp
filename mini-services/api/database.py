"""Database connection layer — Neon PostgreSQL with automatic SQLite fallback.

- postgresql:// or postgres://  -> psycopg3 driver with Neon-safe settings
- sqlite:///...                 -> local SQLite file as given
- missing/empty/unreadable      -> local SQLite fallback (service never crashes)
"""
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv(override=True)

FALLBACK_SQLITE = "sqlite:////home/z/my-project/db/buildora.db"
_raw_url = os.getenv("DATABASE_URL", "").strip()

if _raw_url.startswith(("postgresql://", "postgres://")):
    DATABASE_URL = _raw_url.replace("postgresql://", "postgresql+psycopg://").replace(
        "postgres://", "postgresql+psycopg://"
    )
    _connect_args = {"sslmode": "require", "prepared_statement_cache_size": 0}
    _engine_kwargs = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
        "pool_size": 5,
        "max_overflow": 10,
    }
elif _raw_url.startswith("sqlite"):
    DATABASE_URL = _raw_url
    _connect_args = {"check_same_thread": False}
    _engine_kwargs = {}
else:
    DATABASE_URL = FALLBACK_SQLITE
    _connect_args = {"check_same_thread": False}
    _engine_kwargs = {}

# Make sure the SQLite parent directory exists before the engine touches it.
if DATABASE_URL.startswith("sqlite"):
    _path = DATABASE_URL.replace("sqlite:///", "")
    if _path and not _path.startswith(":memory:"):
        os.makedirs(os.path.dirname(_path), exist_ok=True)

engine = create_engine(DATABASE_URL, connect_args=_connect_args, **_engine_kwargs)

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
