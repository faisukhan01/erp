#!/bin/bash
# ONYX keepalive — idempotent service (re)starter.
# The sandbox reaps processes on restart and user-mode boots start nothing,
# so this script is the single source of truth for bringing the IDE back.
# Safe to run repeatedly: it skips anything already listening.

PORT_NEXT=3000
PORT_IDE=3003
PROJECT=/home/z/my-project

up() { curl -s -o /dev/null --connect-timeout 2 --max-time 3 "http://localhost:$1" ; }

# Monaco assets: vendored at runtime and tracked in git, but a restore can
# still race the checkout — re-vendor on every run if the loader is missing.
# Cheap no-op when present.
cd "$PROJECT" || exit 1
[ -f public/monaco/vs/loader.js ] || bun run setup:monaco >/dev/null 2>&1

# Next.js dev server
if up "$PORT_NEXT"; then
  echo "[keepalive] next dev already up on $PORT_NEXT"
else
  cd "$PROJECT" || exit 1
  nohup bun run dev >/dev/null 2>&1 &
  echo $! > "$PROJECT/.zscripts/dev.pid"
  disown $! 2>/dev/null || true
  echo "[keepalive] next dev launched on $PORT_NEXT (pid $(cat "$PROJECT/.zscripts/dev.pid"))"
fi

# Onyx IDE companion server (terminal + AI agent)
if up "$PORT_IDE"; then
  echo "[keepalive] ide-server already up on $PORT_IDE"
else
  cd "$PROJECT/mini-services/ide-server" || exit 1
  [ -d node_modules ] || bun install >/dev/null 2>&1
  nohup bun --hot index.ts >> server.log 2>&1 &
  disown $! 2>/dev/null || true
  echo "[keepalive] ide-server launched on $PORT_IDE"
fi

# Workspace: runtime data outside git — a sandbox restore wipes it. Recreate
# the directory so the explorer, preview and git bridge (which resolves
# through the parent project repo) all come back.
mkdir -p "$PROJECT/ide-workspace"
