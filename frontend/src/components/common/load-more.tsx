"use client";

import { Button, Spinner } from "@heroui/react";
import { useI18n } from "@/lib/i18n";

/**
 * "Load more" for cursor-infinite feeds (infos / posts / comments).
 * Wire it to a useInfiniteQuery result.
 */
export function LoadMore({
  hasNextPage,
  isFetching,
  onLoadMore,
}: {
  hasNextPage?: boolean;
  isFetching?: boolean;
  onLoadMore: () => void;
}) {
  const { t } = useI18n();
  if (!hasNextPage) return null;
  return (
    <div className="flex justify-center py-4">
      <Button variant="secondary" onPress={onLoadMore} isPending={isFetching}>
        {({ isPending }) => (
          <>
            {isPending && <Spinner size="sm" />}
            {t.common.loadMore}
          </>
        )}
      </Button>
    </div>
  );
}
