/* E2E test: Onyx AI agent must WRITE files to the workspace (not just chat). */
import { io } from "socket.io-client";

const socket = io("http://localhost:3003/", { transports: ["websocket"] });

const id = "test-" + Date.now();
let deltas = 0;
const files: { path: string; action: string; lines: number }[] = [];

const timer = setTimeout(() => {
  console.error("TIMEOUT after 120s. deltas=" + deltas + " files=" + JSON.stringify(files));
  process.exit(1);
}, 120_000);

socket.on("connect", () => {
  console.log("connected:", socket.id);
  socket.emit("ai:send", {
    id,
    messages: [{ role: "user", content: "Build a tiny pomodoro timer web app. Keep it small." }],
  });
});

socket.on("ai:delta", (d: { delta: string }) => {
  deltas++;
  if (deltas <= 3) console.log("delta sample:", JSON.stringify(d.delta.slice(0, 60)));
});

socket.on("ai:file", (f: { path: string; action: string; lines: number }) => {
  files.push(f);
  console.log("FILE WRITTEN:", f.path, f.action, f.lines + " lines");
});

socket.on("ai:file-error", (e: { path: string; error: string }) => {
  console.error("FILE ERROR:", e.path, e.error);
});

socket.on("ai:done", (d: { files: unknown[] }) => {
  console.log("DONE. total deltas:", deltas, "files:", JSON.stringify(d.files));
  clearTimeout(timer);
  socket.close();
  process.exit(files.length > 0 ? 0 : 2);
});

socket.on("ai:error", (e: { error: string }) => {
  console.error("AI ERROR:", e.error);
  clearTimeout(timer);
  process.exit(1);
});

socket.on("connect_error", (e: Error) => {
  console.error("CONNECT ERROR:", e.message);
});
