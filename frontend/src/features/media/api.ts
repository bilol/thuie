"use client";

import { api, uploadBytes } from "@/lib/api/client";
import type { MediaObject, MediaRequest, MediaUpload } from "@/lib/api/types";

/**
 * Media (BACKEND.md §6.9, §8). Two-step upload: POST /media mints a row and
 * returns a slot `upload_url` — the API's own auth-guarded PUT endpoint — then
 * the raw bytes are pushed there with their original content-type via the
 * client's `uploadBytes` transport helper (it attaches the bearer token and
 * maps non-OK into an ApiError, so this stays a normal authenticated API call).
 */

export const mediaApi = {
  request: (body: MediaRequest) => api.post<MediaUpload>("/media", body),
  get: (id: string) => api.get<MediaObject>(`/media/${id}`),
};

/** Request a slot then PUT the file to the presigned URL. Returns the media id. */
export async function uploadFile(
  file: File,
  kind: MediaRequest["kind"],
): Promise<{ media_id: string }> {
  const slot = await mediaApi.request({
    kind,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
  });
  // The slot URL is the guarded `PUT /media/:id/content` endpoint (not a
  // third-party presigned URL), so it needs the bearer token the client's
  // raw-upload helper attaches (a raw fetch would otherwise skip the interceptor).
  await uploadBytes(slot.upload_url, file, file.type || "application/octet-stream");
  return { media_id: slot.media_id };
}
