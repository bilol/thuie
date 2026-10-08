import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { ApiError, type ApiErrorBody } from "./errors";
import { readAccess, readRefresh, useSession } from "@/lib/auth/store";
import { uuid } from "@/lib/utils";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";

export const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  // snake_case bodies go as-is (§2); axios does no case transform.
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
  /** §2 If-Match optimistic-lock token for PATCH. */
  ifMatch?: string | number;
  /** skip the bearer header (public auth endpoints). */
  noAuth?: boolean;
}

// Request: bearer + Idempotency-Key on POST + optional If-Match.
http.interceptors.request.use((config) => {
  const c = config as RetriableConfig;
  const token = readAccess();
  if (token && !c.noAuth) c.headers.set("Authorization", `Bearer ${token}`);
  if (c.method?.toLowerCase() === "post") {
    if (!c.headers.has("Idempotency-Key")) c.headers.set("Idempotency-Key", uuid());
  }
  if (c.ifMatch != null) c.headers.set("If-Match", String(c.ifMatch));
  return c;
});

// --- single-flight refresh (BACKEND.md §3, §6.1) -----------------------------
let refreshInFlight: Promise<string | null> | null = null;

async function runRefresh(): Promise<string | null> {
  const refresh = readRefresh();
  if (!refresh) return null;
  try {
    // Bare axios call (not `http`) so it never recurses through the 401 handler.
    const { data } = await axios.post(
      `${BASE_URL}/auth/refresh`,
      { refresh_token: refresh },
      { headers: { "Content-Type": "application/json" } },
    );
    useSession.getState().applyAuth(data);
    return data.access_token as string;
  } catch {
    useSession.getState().clear();
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
    return null;
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorBody>) => {
    const c = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // §5 one-shot refresh on 401 token_expired, then replay the original call.
    if (status === 401 && c && !c._retried && !c.noAuth && readRefresh()) {
      c._retried = true;
      refreshInFlight ??= runRefresh().finally(() => (refreshInFlight = null));
      const newToken = await refreshInFlight;
      if (newToken) {
        c.headers.set("Authorization", `Bearer ${newToken}`);
        return http.request(c);
      }
    }

    throw toApiError(error);
  },
);

function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
  if (!error.response) {
    // Network / CORS / server down → surface as a retryable transport error.
    return new ApiError(0, { code: "internal_error" }, error.message);
  }
  const body = error.response.data ?? {};
  const err = new ApiError(error.response.status, body, body.message);
  const retryAfter = error.response.headers["retry-after"];
  if (retryAfter) err.retryAfterSec = Number(retryAfter);
  return err;
}

// --- typed verbs -------------------------------------------------------------

export interface RequestOpts extends AxiosRequestConfig {
  ifMatch?: string | number;
  noAuth?: boolean;
}

export const api = {
  get: <T>(url: string, opts?: RequestOpts) =>
    http.get<T>(url, opts).then((r) => r.data),
  post: <T>(url: string, body?: unknown, opts?: RequestOpts) =>
    http.post<T>(url, body, opts).then((r) => r.data),
  patch: <T>(url: string, body?: unknown, opts?: RequestOpts) =>
    http.patch<T>(url, body, opts).then((r) => r.data),
  put: <T>(url: string, body?: unknown, opts?: RequestOpts) =>
    http.put<T>(url, body, opts).then((r) => r.data),
  del: <T>(url: string, opts?: RequestOpts) =>
    http.delete<T>(url, opts).then((r) => r.data),
};

// --- raw byte upload ---------------------------------------------------------

/**
 * PUT a file/blob straight to a server-minted slot URL (BACKEND.md §8 two-step
 * upload). This deliberately bypasses the JSON axios pipeline — a file body must
 * keep its own content-type — but the write endpoint is auth-guarded, so the
 * bearer token the request interceptor would have added is attached here. Non-OK
 * responses are mapped to an ApiError like every other call, so callers get a
 * localized `code` rather than a bare transport error.
 */
export async function uploadBytes(
  url: string,
  body: BodyInit,
  contentType: string,
): Promise<void> {
  const token = readAccess();
  const res = await fetch(url, {
    method: "PUT",
    body,
    headers: {
      "Content-Type": contentType,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    let parsed: Partial<ApiErrorBody> | undefined;
    try {
      parsed = (await res.json()) as Partial<ApiErrorBody>;
    } catch {
      /* non-JSON error body — fall through to a status-only ApiError */
    }
    throw new ApiError(res.status, parsed ?? {});
  }
}
