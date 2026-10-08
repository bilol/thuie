"use client";

import * as React from "react";
import Link from "next/link";
import { Button, Card, Chip, Typography } from "@heroui/react";
import { Star } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { LoadMore } from "@/components/common/load-more";
import { useFavorites, useRemoveFavorite } from "@/features/engagement";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Favorite, FavoriteTargetType } from "@/lib/api/types";

const ROUTE: Partial<Record<FavoriteTargetType, (id: string) => string>> = {
  info: (id) => `/infos/${id}`,
  profile: (id) => `/alumni/${id}`,
  post: (id) => `/forum/${id}`,
};

function FavoriteRow({ fav }: { fav: Favorite }) {
  const { t } = useI18n();
  const remove = useRemoveFavorite();
  const href = ROUTE[fav.target_type]?.(fav.target_id);
  const named = !!fav.title;
  const openable = named && !!href;

  return (
    <Card>
      <Card.Content className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Chip size="sm" variant="tertiary" color="accent">{t.targetTypes[fav.target_type] ?? fav.target_type}</Chip>
          <Button
            isIconOnly
            size="sm"
            variant="primary"
            className="relative z-10 ml-auto"
            aria-label={t.favorites.unfavoriteAria}
            isPending={remove.isPending}
            onPress={() => remove.mutate({ target_type: fav.target_type, target_id: fav.target_id })}
          >
            <Star size={16} fill="currentColor" />
          </Button>
        </div>
        <Typography type="h6" className={openable ? "leading-snug" : "leading-snug text-muted"}>
          {openable ? (
            <Link href={href!} className="after:absolute after:inset-0">{fav.title}</Link>
          ) : (
            fav.title ?? t.common.unavailable
          )}
        </Typography>
        {!!fav.subtitle && (
          <Typography type="body-sm" color="muted" className="line-clamp-2">{fav.subtitle}</Typography>
        )}
        <Typography type="body-xs" color="muted" className="ml-auto">{t.favorites.savedAt(formatDate(fav.created_at))}</Typography>
      </Card.Content>
    </Card>
  );
}

function List({ type }: { type?: FavoriteTargetType }) {
  const { t } = useI18n();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useFavorites(type);
  const items = data?.pages.flatMap((p) => p.data) ?? [];
  return (
    <StateBoundary
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={items.length === 0}
      emptyTitle={t.favorites.emptyTitle}
      emptyBody={t.favorites.emptyBody}
      onRetry={() => refetch()}
    >
      <div className="space-y-3">
        {items.map((fav) => (
          <FavoriteRow key={`${fav.target_type}:${fav.target_id}`} fav={fav} />
        ))}
      </div>
      <LoadMore hasNextPage={hasNextPage} isFetching={isFetchingNextPage} onLoadMore={() => fetchNextPage()} />
    </StateBoundary>
  );
}

export default function FavoritesPage() {
  const { t } = useI18n();
  const [tab, setTab] = React.useState("all");
  const type = tab === "all" ? undefined : (tab as FavoriteTargetType);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "info", "profile", "post", "comment"] as const).map((key) => (
          <Button key={key} size="sm" variant={tab === key ? "primary" : "tertiary"} onPress={() => setTab(key)}>
            {t.favorites.tabs[key]}
          </Button>
        ))}
      </div>
      <div className="pt-2">
        <List type={type} />
      </div>
    </div>
  );
}
