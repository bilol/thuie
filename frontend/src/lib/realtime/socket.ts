import { io, type Socket } from "socket.io-client";
import { readAccess } from "@/lib/auth/store";

/**
 * Socket.IO client for the /realtime namespace (backend realtime.gateway.ts).
 * REST is the source of truth; this only delivers increments:
 *   server → message:new, message:read, notification:new, moderation:status, presence:update
 *   client → conversation:join|leave, typing:start|stop
 * Auth is the same short access JWT via the handshake (`auth.token`).
 */

const NAMESPACE = "/realtime";

/**
 * The baked NEXT_PUBLIC_WS_URL fixes the scheme/port, but on the client we swap
 * in the *current* hostname so browsing via IP or domain both reach the API
 * (e.g. http://<ip>:3002 → ws://<ip>:5001) without a rebuild per host.
 */
function resolveWsUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:5000";
  if (typeof window === "undefined") return configured;
  try {
    const u = new URL(configured);
    u.protocol = window.location.protocol === "https:" ? "https:" : "http:";
    u.hostname = window.location.hostname;
    return u.origin;
  } catch {
    return configured;
  }
}

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

/** Connect (or reconnect with the current token). Safe to call repeatedly. */
export function connectSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("connectSocket is client-only");
  }
  if (socket?.connected) return socket;
  socket?.close();
  socket = io(resolveWsUrl() + NAMESPACE, {
    auth: { token: readAccess() ?? undefined },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 800,
    autoConnect: true,
  });
  return socket;
}

/** Re-auth after a token refresh (the access JWT rotated underneath us). */
export function reauthSocket(): void {
  if (!socket) return;
  socket.auth = { token: readAccess() ?? undefined };
  socket.disconnect().connect();
}

export function disconnectSocket(): void {
  socket?.close();
  socket = null;
}

// --------------------------------------------------------------- typed API --
export type ServerEvent =
  | "message:new"
  | "message:read"
  | "notification:new"
  | "moderation:status"
  | "presence:update";
export type ClientEvent =
  | "conversation:join"
  | "conversation:leave"
  | "typing:start"
  | "typing:stop";

export function onServer(event: ServerEvent, handler: (payload: any) => void): () => void {
  const s = connectSocket();
  s.on(event, handler);
  return () => s.off(event, handler);
}

export function emitClient(event: ClientEvent, payload?: Record<string, unknown>): void {
  connectSocket().emit(event, payload ?? {});
}
