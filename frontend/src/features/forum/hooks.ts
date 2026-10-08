"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { CommentCreate, ForumPost, PostCreate } from "@/lib/api/types";
import { forumApi, forumKeys, type PostListParams } from "./api";

export const usePostsFeed = (params: PostListParams = {}) =>
  useInfiniteQuery({
    queryKey: forumKeys.posts(params),
    queryFn: ({ pageParam }) => forumApi.listPosts({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });

export const usePost = (id: string) =>
  useQuery({ queryKey: forumKeys.post(id), queryFn: () => forumApi.getPost(id) });

export const useCreatePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: forumApi.createPost,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forum", "posts"] }),
    meta: { silentError: true },
  });
};

export const useUpdatePost = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { body: PostCreate; version: number }) =>
      forumApi.updatePost(id, vars.body, vars.version),
    onSuccess: (post) => {
      qc.setQueryData(forumKeys.post(id), post);
      qc.invalidateQueries({ queryKey: ["forum", "posts"] });
    },
    meta: { silentError: true },
  });
};

export const useDeletePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => forumApi.deletePost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forum", "posts"] }),
  });
};

/** Which flag and counter each toggle owns on the cached post row. */
const TOGGLE_FIELDS = {
  like: { flag: "liked", count: "like_count" },
  bookmark: { flag: "bookmarked", count: "bookmark_count" },
} as const;

/** The paginated feed cache shape we fold a toggle into, narrowed to what we touch. */
type PostFeedCache = { pages: { data: ForumPost[] }[] };

/**
 * Toggle engagement, optimistically: the button reacts on press instead of
 * waiting for the round-trip, and the server's post row (authoritative counters,
 * flags and recent likers) replaces the guess in onSuccess. The cache key is
 * always the id we mutated — never the response's own id, which a server that
 * still answers `{active, count}` leaves undefined, writing the update nowhere
 * and leaving the UI stale until a manual refresh.
 *
 * A card on the browse feed lives in the paginated `forum/posts` cache, NOT the
 * single-post cache, so both are flipped together — otherwise the button reacts
 * on the thread page yet stays frozen in the list.
 */
function usePostToggle(kind: keyof typeof TOGGLE_FIELDS) {
  const qc = useQueryClient();
  const { flag, count } = TOGGLE_FIELDS[kind];
  const flip = (post: ForumPost, active: boolean): ForumPost =>
    ({
      ...post,
      [flag]: active,
      [count]: Math.max(0, post[count] + (active ? 1 : -1)),
    }) as ForumPost;

  /** Fold a post into every loaded feed page; the card reads from here. */
  const patchFeed = (id: string, mutator: (post: ForumPost) => ForumPost) =>
    qc.setQueriesData<PostFeedCache | undefined>(
      { queryKey: ["forum", "posts"] },
      (old) =>
        old && {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((post) => (post.id === id ? mutator(post) : post)),
          })),
        },
    );

  // Read the row from whichever cache holds it: the detail query wins, else fall
  // back to the feed so the card can flip before its thread has ever been opened.
  const readPost = (id: string): ForumPost | undefined => {
    const detail = qc.getQueryData<ForumPost>(forumKeys.post(id));
    if (detail) return detail;
    for (const [, data] of qc.getQueriesData<PostFeedCache | undefined>({
      queryKey: ["forum", "posts"],
    })) {
      const hit = data?.pages.flatMap((p) => p.data).find((post) => post.id === id);
      if (hit) return hit;
    }
    return undefined;
  };

  return useMutation({
    mutationFn: (id: string) => forumApi[kind](id),
    onMutate: async (id) => {
      const key = forumKeys.post(id);
      await qc.cancelQueries({ queryKey: key });
      const previous = readPost(id);
      if (previous) {
        const next = flip(previous, !previous[flag]);
        if (qc.getQueryData(key)) qc.setQueryData(key, next);
        patchFeed(id, () => next);
      }
      return { previous };
    },
    onError: (_err, id, ctx) => {
      // The toggle never landed: put the pre-click row back in both caches so the
      // button lies in neither direction.
      if (!ctx?.previous) return;
      const key = forumKeys.post(id);
      if (qc.getQueryData(key)) qc.setQueryData(key, ctx.previous);
      patchFeed(id, () => ctx.previous!);
    },
    onSuccess: (post, id) => {
      const key = forumKeys.post(id);
      // The server sends the full, authoritative row — fold its counters/flags into
      // both caches instead of refetching (a feed-wide invalidate resets scroll and
      // re-spins every page for a single tap).
      if (post?.id) {
        if (qc.getQueryData(key)) qc.setQueryData(key, post);
        patchFeed(id, (existing) => ({ ...existing, ...post }));
      } else {
        qc.invalidateQueries({ queryKey: key });
        qc.invalidateQueries({ queryKey: ["forum", "posts"] });
      }
      // A bookmark IS a favorites(post) row, so keep the saved probes and the
      // /me/favorites list in step with it.
      if (kind === "bookmark") qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
export const useToggleLike = () => usePostToggle("like");
export const useToggleBookmark = () => usePostToggle("bookmark");

export const useCommentsFeed = (id: string) =>
  useQuery({
    queryKey: forumKeys.comments(id),
    queryFn: () => forumApi.listComments(id),
  });

export const useCreateComment = (postId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CommentCreate) => forumApi.createComment(postId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: forumKeys.comments(postId) });
      qc.invalidateQueries({ queryKey: forumKeys.post(postId) });
    },
  });
};

export const useDeleteComment = (postId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => forumApi.deleteComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: forumKeys.comments(postId) }),
  });
};

export const useTags = () =>
  useQuery({
    queryKey: forumKeys.tags(),
    queryFn: forumApi.tags,
    staleTime: 5 * 60_000,
  });
