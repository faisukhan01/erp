/* ONYX IDE — singleton client socket to the ide-server mini service */

"use client";

import { io, type Socket } from "socket.io-client";
import { useIde } from "./store";

let socket: Socket | null = null;
let initialized = false;

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io("/?XTransformPort=3003", {
    transports: ["websocket", "polling"],
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1200,
    timeout: 10000,
    path: "/",
  });

  if (!initialized) {
    initialized = true;
    socket.on("connect", () => useIde.getState().setSocketStatus("online"));
    socket.on("disconnect", () => useIde.getState().setSocketStatus("offline"));
    socket.on("connect_error", () => useIde.getState().setSocketStatus("offline"));
    socket.io.on("reconnect_attempt", () => useIde.getState().setSocketStatus("connecting"));
  }

  return socket;
}
