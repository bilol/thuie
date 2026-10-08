"use client";

import { useMutation } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/store";
import { disconnectSocket } from "@/lib/realtime/socket";
import type { AuthResult } from "@/lib/api/types";
import { authApi } from "./api";

/** Apply the returned token pair into the store (access→memory, refresh→persist). */
function adopt(result: AuthResult) {
  useSession.getState().applyAuth(result);
}

export const useLogin = () =>
  useMutation({ mutationFn: authApi.login, onSuccess: adopt, meta: { silentError: true } });

export const useRegister = () =>
  useMutation({ mutationFn: authApi.register, onSuccess: adopt, meta: { silentError: true } });

export const useVerify = () => useMutation({ mutationFn: authApi.verify, meta: { silentError: true } });
export const useResend = () => useMutation({ mutationFn: authApi.resend });
export const useForgot = () => useMutation({ mutationFn: authApi.forgot });
export const useReset = () => useMutation({ mutationFn: authApi.reset, meta: { silentError: true } });
export const useChangePassword = () =>
  useMutation({ mutationFn: authApi.changePassword, meta: { silentError: true } });

export const useLogout = () =>
  useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      disconnectSocket();
      useSession.getState().clear();
    },
  });
