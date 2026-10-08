"use client";

import { api } from "@/lib/api/client";
import type {
  Comment,
  CommentCreate,
  CursorPage,
  ForumPost,
  PostCreate,
  Tag,
} from "@/lib/api/types";

/** Forum: posts (cursor feed), engagement toggles, threaded comments, tags. */

export const forumKeys = {
  posts: (params: object) => ["forum", "posts", params] as const,
  post: (id: string) => ["forum", "post", id] as const,
  comments: (id: string) => ["forum", "comments", id] as const,
  tags: () => ["forum", "tags"] as const,
};

export interface PostListParams {
  tag?: string;
  q?: string;
  limit?: number;
}

export const forumApi = {
  listPosts: (params: PostListParams & { cursor?: string }) =>
    api.get<CursorPage<ForumPost>>("/posts", { params }),
  getPost: (id: string) => api.get<ForumPost>(`/posts/${id}`),
  createPost: (body: PostCreate) => api.post<ForumPost>("/posts", body),
  updatePost: (id: string, body: PostCreate, version: number) =>
    api.patch<ForumPost>(`/posts/${id}`, body, { ifMatch: version }),
  deletePost: (id: string) => api.del<void>(`/posts/${id}`),

  like: (id: string) => api.post<ForumPost>(`/posts/${id}/like`),
  bookmark: (id: string) => api.post<ForumPost>(`/posts/${id}/bookmark`),

  // The thread endpoint returns the whole single-level tree in one shot —
  // `{ data: Comment[] }` with no cursor meta (comments.service.thread()).
  listComments: (id: string) =>
    api.get<{ data: Comment[] }>(`/posts/${id}/comments`),
  createComment: (id: string, body: CommentCreate) =>
    api.post<Comment>(`/posts/${id}/comments`, body),
  updateComment: (id: string, body: { content: string; version: number }) =>
    api.patch<Comment>(`/comments/${id}`, body, { ifMatch: body.version }),
  deleteComment: (id: string) => api.del<void>(`/comments/${id}`),

  // `GET /tags` returns `{ data: [...] }` (mobile reads `result['data']`).
  tags: () => api.get<{ data: Tag[] }>("/tags").then((r) => r.data),
};
