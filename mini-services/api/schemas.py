"""Pydantic schemas — API request/response contracts."""
from datetime import datetime

from pydantic import BaseModel


class UserCreate(BaseModel):
    id: str | None = None


class UserOut(BaseModel):
    id: str
    created_at: datetime


class ProjectCreate(BaseModel):
    user_id: str
    prompt: str


class ChatCreate(BaseModel):
    content: str


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime


class VersionMeta(BaseModel):
    id: str
    version_number: int
    summary: str
    created_at: datetime


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str
    initial_prompt: str
    current_version_id: str | None
    version_count: int
    created_at: datetime
    updated_at: datetime


class ProjectDetail(ProjectOut):
    messages: list[MessageOut]
    versions: list[VersionMeta]
    current_html: str | None


class RestoreCreate(BaseModel):
    version_id: str
