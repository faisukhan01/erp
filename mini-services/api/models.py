"""SQLAlchemy ORM models for Buildora — the AI app builder platform."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def uid() -> str:
    return str(uuid.uuid4())


def now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    projects: Mapped[list["Project"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(200), default="Untitled Project")
    description: Mapped[str] = mapped_column(Text, default="")
    initial_prompt: Mapped[str] = mapped_column(Text, default="")
    # Plain reference (no FK) to avoid circular dependency with versions table
    current_version_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    user: Mapped["User"] = relationship(back_populates="projects")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="Message.created_at"
    )
    versions: Mapped[list["Version"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="Version.version_number"
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), index=True)
    role: Mapped[str] = mapped_column(String(20))  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    project: Mapped["Project"] = relationship(back_populates="messages")


class Version(Base):
    __tablename__ = "versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), index=True)
    version_number: Mapped[int] = mapped_column(Integer)
    html_code: Mapped[str] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    project: Mapped["Project"] = relationship(back_populates="versions")
