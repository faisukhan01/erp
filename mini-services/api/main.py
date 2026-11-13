"""Buildora API — FastAPI backend for the AI app builder platform.

Powered by Z.AI (via the ai-worker service) and Neon PostgreSQL.
All routes are prefixed with /api so the gateway can forward them.
"""
import asyncio
import json
import os
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, get_db
from models import Message, Project, User, Version
from prompts import BUILDER_SYSTEM, NAMING_SYSTEM, NAMING_USER_TMPL, PLANNER_SYSTEM
from schemas import (
    ChatCreate,
    ProjectCreate,
    ProjectDetail,
    ProjectOut,
    RestoreCreate,
    UserCreate,
    UserOut,
)

load_dotenv()
AI_WORKER_URL = os.getenv("AI_WORKER_URL", "http://127.0.0.1:8001")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Buildora API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- helpers

def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def extract_html(raw: str) -> str:
    """Pull the pure HTML document out of a model response."""
    t = (raw or "").strip()
    fence = re.search(r"```(?:html)?\s*(.*?)```", t, re.S | re.I)
    if fence:
        inner = fence.group(1).strip()
        if "<!doctype" in inner.lower() or "<html" in inner.lower():
            t = inner
    lower = t.lower()
    start = lower.find("<!doctype html")
    if start == -1:
        start = lower.find("<html")
    if start > 0:
        t = t[start:]
    end = t.lower().rfind("</html>")
    if end != -1:
        t = t[: end + 7]
    return t.strip()


def extract_json_object(raw: str) -> dict | None:
    """Best-effort extraction of a JSON object from a model response."""
    if not raw:
        return None
    t = raw.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", t, re.S)
    if fence:
        t = fence.group(1).strip()
    start = t.find("{")
    end = t.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(t[start : end + 1])
    except Exception:
        return None


SCRIPT_BLOCK_RE = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.S | re.I)
ATTR_TYPE_RE = re.compile(r"type\s*=\s*[\"']([^\"']*)[\"']", re.I)


def is_complete_html(t: str | None) -> bool:
    """A build is only shippable if the document actually closes."""
    return bool(t) and t.lower().rstrip().endswith("</html>")


def extract_inline_scripts(html: str) -> list[str]:
    """Inline, executable <script> bodies (skips src=, modules, JSON-LD...)."""
    out: list[str] = []
    for attrs, body in SCRIPT_BLOCK_RE.findall(html or ""):
        if re.search(r"\bsrc\s*=", attrs, re.I):
            continue
        m = ATTR_TYPE_RE.search(attrs)
        typ = (m.group(1).strip().lower() if m else "")
        if typ in {"module", "application/json", "application/ld+json", "importmap", "speculationrules"}:
            continue
        if typ and not (typ.startswith("text/javascript") or typ.startswith("application/javascript") or typ == "text/babel"):
            continue
        if body.strip():
            out.append(body)
    return out


async def validate_build(client: httpx.AsyncClient, html: str) -> list[str]:
    """Ask the ai-worker to parse every inline script with a real JS engine and
    verify inline on* handlers reference top-level globals. Returns a list of
    human-readable errors (empty = valid)."""
    scripts = extract_inline_scripts(html)
    if not scripts and not html:
        return []
    try:
        r = await client.post(
            f"{AI_WORKER_URL}/v1/check-js",
            json={"scripts": scripts, "html": html},
            timeout=httpx.Timeout(30.0, connect=10.0),
        )
        data = r.json()
        if data.get("ok"):
            return []
        return [str(e.get("message") or e) for e in data.get("errors", [])]
    except Exception:
        return []  # validator unreachable — never block a build on the validator itself


def project_to_out(p: Project, version_count: int) -> ProjectOut:
    return ProjectOut(
        id=p.id,
        name=p.name,
        description=p.description,
        initial_prompt=p.initial_prompt,
        current_version_id=p.current_version_id,
        version_count=version_count,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


def project_to_detail(p: Project) -> ProjectDetail:
    current_html = None
    if p.current_version_id:
        v = next((v for v in p.versions if v.id == p.current_version_id), None)
        if v:
            current_html = v.html_code
    return ProjectDetail(
        id=p.id,
        name=p.name,
        description=p.description,
        initial_prompt=p.initial_prompt,
        current_version_id=p.current_version_id,
        version_count=len(p.versions),
        created_at=p.created_at,
        updated_at=p.updated_at,
        messages=[
            {"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at}
            for m in p.messages
        ],
        versions=[
            {
                "id": v.id,
                "version_number": v.version_number,
                "summary": v.summary,
                "created_at": v.created_at,
            }
            for v in p.versions
        ],
        current_html=current_html,
    )


def get_project_or_404(db: Session, pid: str) -> Project:
    p = db.get(Project, pid)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


# ---------------------------------------------------------------- health

@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "service": "buildora-api", "database": "connected"}


# ---------------------------------------------------------------- users

@app.post("/api/users", response_model=UserOut)
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    uid = body.id or str(uuid.uuid4())
    existing = db.get(User, uid)
    if existing:
        return UserOut(id=existing.id, created_at=existing.created_at)
    user = User(id=uid)
    db.add(user)
    db.commit()
    return UserOut(id=user.id, created_at=user.created_at)


# ---------------------------------------------------------------- projects

@app.get("/api/projects", response_model=list[ProjectOut])
def list_projects(user_id: str, db: Session = Depends(get_db)):
    counts = dict(
        db.execute(
            select(Version.project_id, func.count(Version.id)).group_by(Version.project_id)
        ).all()
    )
    projects = (
        db.execute(
            select(Project).where(Project.user_id == user_id).order_by(Project.updated_at.desc())
        )
        .scalars()
        .all()
    )
    return [project_to_out(p, counts.get(p.id, 0)) for p in projects]


@app.post("/api/projects", response_model=ProjectDetail)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    if not db.get(User, body.user_id):
        db.add(User(id=body.user_id))
        db.commit()
    prompt = body.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    project = Project(id=str(uuid.uuid4()), user_id=body.user_id, initial_prompt=prompt)
    db.add(project)
    db.flush()
    db.add(Message(id=str(uuid.uuid4()), project_id=project.id, role="user", content=prompt))
    db.commit()
    db.refresh(project)
    return project_to_detail(project)


@app.get("/api/projects/{pid}", response_model=ProjectDetail)
def get_project(pid: str, db: Session = Depends(get_db)):
    return project_to_detail(get_project_or_404(db, pid))


@app.patch("/api/projects/{pid}", response_model=ProjectDetail)
def rename_project(pid: str, body: dict, db: Session = Depends(get_db)):
    project = get_project_or_404(db, pid)
    name = (body.get("name") or "").strip()
    if name:
        project.name = name[:200]
    description = body.get("description")
    if description is not None:
        project.description = str(description).strip()[:500]
    project.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(project)
    return project_to_detail(project)


@app.delete("/api/projects/{pid}")
def delete_project(pid: str, db: Session = Depends(get_db)):
    project = get_project_or_404(db, pid)
    db.delete(project)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- raw preview

@app.get("/api/projects/{pid}/preview", response_class=HTMLResponse)
def preview_project(pid: str, v: int | None = None, db: Session = Depends(get_db)):
    """Serve the generated app as raw HTML — used for open-in-new-tab
    and the dashboard live thumbnails."""
    project = get_project_or_404(db, pid)
    html = None
    if v is not None:
        version = next((x for x in project.versions if x.version_number == v), None)
        html = version.html_code if version else None
    elif project.current_version_id:
        version = next((x for x in project.versions if x.id == project.current_version_id), None)
        html = version.html_code if version else None
    if not html:
        raise HTTPException(status_code=404, detail="No build available yet")
    return HTMLResponse(content=html)


# ---------------------------------------------------------------- chat

@app.post("/api/projects/{pid}/chat")
def add_chat_message(pid: str, body: ChatCreate, db: Session = Depends(get_db)):
    project = get_project_or_404(db, pid)
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    msg = Message(id=str(uuid.uuid4()), project_id=project.id, role="user", content=content)
    project.updated_at = datetime.now(timezone.utc)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"id": msg.id, "role": msg.role, "content": msg.content, "created_at": msg.created_at}


# ---------------------------------------------------------------- versions

@app.get("/api/projects/{pid}/versions")
def list_versions(pid: str, db: Session = Depends(get_db)):
    project = get_project_or_404(db, pid)
    return [
        {
            "id": v.id,
            "version_number": v.version_number,
            "summary": v.summary,
            "created_at": v.created_at,
        }
        for v in sorted(project.versions, key=lambda v: v.version_number, reverse=True)
    ]


@app.post("/api/projects/{pid}/restore")
def restore_version(pid: str, body: RestoreCreate, db: Session = Depends(get_db)):
    project = get_project_or_404(db, pid)
    version = db.get(Version, body.version_id)
    if not version or version.project_id != pid:
        raise HTTPException(status_code=404, detail="Version not found")
    project.current_version_id = version.id
    project.updated_at = datetime.now(timezone.utc)
    db.add(
        Message(
            id=str(uuid.uuid4()),
            project_id=pid,
            role="assistant",
            content=f"Restored **{project.name}** to version {version.version_number}.",
        )
    )
    db.commit()
    return {"ok": True, "current_version_id": version.id}


# ---------------------------------------------------------------- AI generation

async def plan_blueprint(client: httpx.AsyncClient, user_request: str) -> dict | None:
    """Ask Z.AI for a compact build blueprint (name, features, palette...)."""
    try:
        r = await client.post(
            f"{AI_WORKER_URL}/v1/chat",
            json={
                "messages": [
                    {"role": "system", "content": PLANNER_SYSTEM},
                    {"role": "user", "content": user_request[:2000]},
                ]
            },
            timeout=httpx.Timeout(90.0, connect=10.0),
        )
        data = extract_json_object(r.json().get("content", ""))
        if data and isinstance(data.get("features"), list):
            return {
                "name": (str(data.get("name") or "").strip() or None),
                "description": (str(data.get("description") or "").strip() or None),
                "tagline": (str(data.get("tagline") or "").strip() or None),
                "features": [str(f).strip() for f in data["features"]][:6],
                "palette": [str(c).strip() for c in (data.get("palette") or []) if c][:4],
                "vibe": (str(data.get("vibe") or "").strip() or None),
            }
    except Exception:
        pass
    return None


@app.post("/api/projects/{pid}/generate")
async def generate(pid: str):
    """Stream the AI build of the app for the latest user request.

    SSE events:
      status  -> {stage: planning|building}
      plan    -> {blueprint: {name, description, tagline, features, palette, vibe}}
      chunk   -> {text}      (true token-level code stream)
      done    -> {version_id, version_number, html, message_id, name, description, elapsed_seconds, chars}
      error   -> {message}
    """
    # Capture all inputs up-front with a short-lived session
    with SessionLocal() as db:
        project = db.get(Project, pid)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        last_user = next((m for m in reversed(project.messages) if m.role == "user"), None)
        if not last_user:
            raise HTTPException(status_code=400, detail="No user request to build from")
        current_html = None
        if project.current_version_id:
            v = db.get(Version, project.current_version_id)
            current_html = v.html_code if v else None
        # Never iterate on top of a truncated document — rebuild fresh instead.
        if current_html and not is_complete_html(current_html):
            current_html = None
        version_number = max((v.version_number for v in project.versions), default=0) + 1
        user_request = last_user.content
        initial_prompt = project.initial_prompt or user_request
        base_broken = current_html is None and project.current_version_id is not None

    async def stream_build(client: httpx.AsyncClient, build_prompt: str, result: dict):
        """Yield ("delta", text) tuples while consuming the worker's SSE stream.
        Fills result["text"] with the full response and result["error"] if any."""
        collected = []
        error_message = None
        try:
            async with client.stream(
                "POST",
                f"{AI_WORKER_URL}/v1/chat/stream",
                json={
                    "messages": [
                        {"role": "system", "content": BUILDER_SYSTEM},
                        {"role": "user", "content": build_prompt},
                    ]
                },
                # read=110: a stalled Z.AI stream aborts after ~2 min instead of
                # wedging the build for 10 (the bug users saw as endless 'typing').
                timeout=httpx.Timeout(600.0, connect=15.0, read=110.0),
            ) as resp:
                if resp.status_code != 200:
                    body = await resp.aread()
                    result["text"] = ""
                    result["error"] = (
                        f"AI worker error ({resp.status_code}): {body[:200].decode(errors='ignore')}"
                    )
                    return
                buffer = ""
                async for raw in resp.aiter_bytes():
                    buffer += raw.decode(errors="ignore")
                    lines = buffer.split("\n")
                    buffer = lines.pop() or ""
                    for line in lines:
                        line = line.strip()
                        if not line.startswith("data:"):
                            continue
                        payload = line[5:].strip()
                        if not payload:
                            continue
                        try:
                            evt = json.loads(payload)
                        except Exception:
                            continue
                        if evt.get("delta"):
                            collected.append(evt["delta"])
                            yield "delta", evt["delta"]
                        elif evt.get("error"):
                            error_message = evt["error"]
                        elif evt.get("done"):
                            pass
            result["text"] = "".join(collected)
            result["error"] = error_message
        except httpx.ReadTimeout:
            # stalled upstream — keep the partial text so the caller's retry
            # loop can attempt a fresh build instead of hanging forever
            result["text"] = "".join(collected)
            result["error"] = "The AI stream stalled mid-build and was stopped."
        except httpx.HTTPError as exc:
            result["text"] = "".join(collected)
            result["error"] = f"AI worker connection error: {exc}"

    async def stream() -> AsyncGenerator[str, None]:
        started = datetime.now(timezone.utc)
        name = None
        description = None
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(600.0, connect=15.0)) as client:
                # 1) Blueprint on the first build (fast, non-streaming)
                if version_number == 1:
                    yield sse("status", {"stage": "planning"})
                    blueprint = await plan_blueprint(client, user_request)
                    if blueprint:
                        name = blueprint.get("name")
                        description = blueprint.get("description")
                        yield sse("plan", {"blueprint": blueprint})
                else:
                    yield sse("status", {"stage": "building"})

                # 2) Build the app with true token streaming (+ 1 automatic retry)
                if current_html:
                    build_prompt = (
                        f"CURRENT CODE:\n```html\n{current_html}\n```\n\n"
                        f"CHANGE REQUEST: {user_request}\n\n"
                        "Return the COMPLETE updated HTML document."
                    )
                elif base_broken:
                    # Previous version was unusable — rebuild the whole idea fresh.
                    build_prompt = (
                        f"Build this web app: {initial_prompt}\n"
                        f"Latest change request from the user: {user_request}\n\n"
                        "Rebuild it from scratch, complete and spectacular, with real working features."
                    )
                else:
                    build_prompt = f"Build this web app: {user_request}\n\nMake it spectacular — a design people screenshot, with real working features."

                html = None
                last_error = None
                for attempt in range(2):
                    yield sse("status", {"stage": "building"})
                    result: dict = {}
                    gen = stream_build(client, build_prompt, result)
                    while True:
                        try:
                            kind, value = await gen.__anext__()
                        except StopAsyncIteration:
                            break
                        if kind == "delta":
                            yield sse("chunk", {"text": value})
                    full_text = result.get("text", "")
                    error_message = result.get("error")
                    candidate = extract_html(full_text)
                    if is_complete_html(candidate):
                        html = candidate
                        break
                    last_error = error_message or "The build was cut off before the document finished — retrying."
                    if attempt == 0:
                        yield sse("status", {"stage": "retrying"})
                        await asyncio.sleep(1.5)

                if not html:
                    message = last_error or "The model returned an empty build. Try again."
                    yield sse("error", {"message": message})
                    return

                # 2b) Self-healing: parse every inline script with a real JS
                # engine, verify inline handlers bind to globals, and auto-repair
                # (max 2 rounds). Incomplete repairs are discarded — a truncated
                # document is never saved over a complete one.
                if not is_complete_html(html):
                    yield sse("error", {"message": last_error or "The build was incomplete. Try again."})
                    return
                for repair_round in range(2):
                    js_errors = await validate_build(client, html)
                    if not js_errors:
                        break
                    yield sse("status", {"stage": "reviewing"})
                    repair_prompt = (
                        f"CURRENT CODE (has JavaScript errors that break the whole app):\n"
                        f"```html\n{html}\n```\n\n"
                        f"ERRORS FOUND:\n" +
                        "\n".join(f"- {e}" for e in js_errors) +
                        "\n\nFix the JavaScript so everything parses cleanly and every inline "
                        "handler works, keep all features and design unchanged, and return the "
                        "COMPLETE updated HTML document from <!DOCTYPE html> to </html>. "
                        "Never truncate or omit any part of the document."
                    )
                    result: dict = {}
                    gen = stream_build(client, repair_prompt, result)
                    while True:
                        try:
                            kind, value = await gen.__anext__()
                        except StopAsyncIteration:
                            break
                        if kind == "delta":
                            yield sse("chunk", {"text": value})
                    repaired = extract_html(result.get("text", ""))
                    if is_complete_html(repaired):
                        html = repaired

                # 3) Persist version + assistant message
                def persist():
                    with SessionLocal() as sdb:
                        p = sdb.get(Project, pid)
                        if not p:
                            return None, None
                        v = Version(
                            id=str(uuid.uuid4()),
                            project_id=pid,
                            version_number=version_number,
                            html_code=html,
                            summary=user_request[:300],
                        )
                        sdb.add(v)
                        p.current_version_id = v.id
                        if version_number == 1:
                            if name:
                                p.name = name
                            if description:
                                p.description = description
                        verb = "Built" if version_number == 1 else "Updated"
                        if version_number == 1:
                            msg_text = (
                                f"{verb} **{p.name}** — version {version_number} is live.\n\n"
                                f"{description or ''}\n\n"
                                f"Applied: \"{user_request[:200]}\""
                            )
                        else:
                            msg_text = (
                                f"Updated **{p.name}** to version {version_number}.\n\n"
                                f"Applied: \"{user_request[:200]}\""
                            )
                        m = Message(
                            id=str(uuid.uuid4()), project_id=pid, role="assistant", content=msg_text
                        )
                        sdb.add(m)
                        p.updated_at = datetime.now(timezone.utc)
                        sdb.commit()
                        return v.id, m.id

                version_id, message_id = await asyncio.to_thread(persist)

                yield sse(
                    "done",
                    {
                        "version_id": version_id,
                        "version_number": version_number,
                        "html": html,
                        "message_id": message_id,
                        "name": name,
                        "description": description,
                        "chars": len(html),
                        "elapsed_seconds": round(
                            (datetime.now(timezone.utc) - started).total_seconds(), 1
                        ),
                    },
                )
        except httpx.HTTPError as exc:
            yield sse("error", {"message": f"AI worker unreachable: {exc}"})
        except Exception as exc:  # pragma: no cover
            yield sse("error", {"message": f"Generation failed: {exc}"})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api")
def root():
    return {"service": "Buildora API", "docs": "/docs", "status": "running"}
