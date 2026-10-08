"use client";

import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth/store";
import type {
  AuthResult,
  ChangePasswordRequest,
  ForgotRequest,
  ForgotResult,
  LoginRequest,
  RegisterRequest,
  ResendRequest,
  ResetRequest,
  ResetResult,
  VerifyRequest,
  VerifyResult,
} from "@/lib/api/types";

/**
 * Auth feature — the only public surfaces (BACKEND.md §3). Tokens land in the
 * session store on success; refresh lives in the axios interceptor.
 */

export const authApi = {
  login: (body: LoginRequest) =>
    api.post<AuthResult>("/auth/login", body, { noAuth: true }),
  register: (body: RegisterRequest) =>
    api.post<AuthResult>("/auth/register", body, { noAuth: true }),
  verify: (body: VerifyRequest) =>
    api.post<VerifyResult>("/auth/verify", body, { noAuth: true }),
  resend: (body: ResendRequest) =>
    api.post<{ sent: boolean }>("/auth/resend", body, { noAuth: true }),
  forgot: (body: ForgotRequest) =>
    api.post<ForgotResult>("/auth/forgot-password", body, { noAuth: true }),
  reset: (body: ResetRequest) =>
    api.post<ResetResult>("/auth/reset-password", body, { noAuth: true }),
  changePassword: (body: ChangePasswordRequest) =>
    api.patch<{ changed: boolean }>("/auth/password", body),
  logout: (opts: { allDevices?: boolean } = {}) =>
    api.post<void>("/auth/logout", {
      refresh_token: useSession.getState().tokens.refresh ?? undefined,
      all_devices: opts.allDevices ?? false,
    }),
};
