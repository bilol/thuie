"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Input, TextField } from "@heroui/react";
import { Search } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { LoadMore } from "@/components/common/load-more";
import { OptionSelect } from "@/components/common/option-select";
import { useI18n } from "@/lib/i18n";
import { PROGRAMS } from "@/lib/reference";
import { NATIONALITIES } from "@/lib/nationalities";
import { useRoleStrategy } from "@/features/me";
import {
  AlumniCard,
  useAlumniFeed,
  type AlumniListParams,
} from "@/features/directory";

export default function AlumniPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { data: strategy } = useRoleStrategy();

  const [q, setQ] = React.useState("");
  const [query, setQuery] = React.useState("");

  const [program, setProgram] = React.useState<string | undefined>();
  const [gradYear, setGradYear] = React.useState<string | undefined>();
  const [country, setCountry] = React.useState<string | undefined>();
  const [companyInput, setCompanyInput] = React.useState("");
  const [company, setCompany] = React.useState<string | undefined>();

  const years = React.useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 46 }, (_, i) => String(now + 5 - i));
  }, []);

  const params: AlumniListParams = React.useMemo(
    () => ({
      q: query || undefined,
      program,
      country: country || undefined,
      graduation_year: gradYear,
      company: company || undefined,
    }),
    [query, program, country, gradYear, company],
  );
  const feed = useAlumniFeed(params);
  const items = feed.data?.pages.flatMap((p) => p.data) ?? [];

  const hasFacets =
    Boolean(program) || Boolean(gradYear) || Boolean(country) || Boolean(company);
  const hasFilters = Boolean(query) || hasFacets;

  const commitText = (
    raw: string,
    set: (v: string | undefined) => void,
  ) => set(raw.trim() || undefined);

  const clearFacets = () => {
    setProgram(undefined);
    setGradYear(undefined);
    setCountry(undefined);
    setCompany("");
    setCompany(undefined);
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q.trim());
          }}
        >
          <TextField aria-label={t.alumni.searchAria} name="q" className="min-w-0 flex-1">
            <Input
              placeholder={t.alumni.searchPlaceholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </TextField>
          <Button type="submit" variant="primary">
            <Search size={16} />
            {t.common.search}
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={!program ? "primary" : "tertiary"}
            onPress={() => setProgram(undefined)}
          >
            {t.alumni.allPrograms}
          </Button>
          {PROGRAMS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={program === p ? "primary" : "tertiary"}
              onPress={() => setProgram(program === p ? undefined : p)}
            >
              {p}
            </Button>
          ))}

          <span className="mx-1 hidden h-5 w-px bg-separator sm:block" />

          <OptionSelect
            ariaLabel={t.alumni.graduationYearAria}
            className="w-32"
            placeholder={t.alumni.anyYear}
            value={gradYear ?? null}
            onChange={setGradYear}
            options={years.map((y) => ({ key: y, label: y }))}
          />
          <OptionSelect
            ariaLabel={t.alumni.countryAria}
            className="w-40"
            placeholder={t.alumni.countryPlaceholder}
            value={country ?? null}
            onChange={setCountry}
            options={NATIONALITIES.map((n) => ({ key: n.code, label: locale === "zh" ? n.zh : n.en }))}
          />
          <TextField
            aria-label={t.alumni.companyAria}
            name="company"
            className="w-36"
          >
            <Input
              placeholder={t.alumni.companyPlaceholder}
              value={companyInput}
              onChange={(e) => setCompanyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitText(companyInput, setCompany);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onBlur={() => commitText(companyInput, setCompany)}
            />
          </TextField>

          {hasFacets && (
            <Button size="sm" variant="ghost" onPress={clearFacets}>
              {t.common.clear}
            </Button>
          )}
        </div>
      </div>

      <StateBoundary
        isLoading={feed.isLoading}
        isError={feed.isError}
        error={feed.error}
        onRetry={() => feed.refetch()}
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-separator py-16 text-center">
            <p className="text-sm font-medium text-foreground">{hasFilters ? t.alumni.empty : t.alumni.emptyTitle}</p>
            {!hasFilters && <p className="max-w-sm text-sm text-muted">{t.alumni.emptyPublishHint}</p>}
            {!hasFilters && strategy?.can_create_profile && (
              <Button variant="primary" className="mt-2" onPress={() => router.push("/me/alumni")}>
                {t.alumni.publishCta}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((a) => (
                <AlumniCard key={a.id} profile={a} />
              ))}
            </div>
            <LoadMore
              hasNextPage={feed.hasNextPage}
              isFetching={feed.isFetchingNextPage}
              onLoadMore={() => feed.fetchNextPage()}
            />
          </>
        )}
      </StateBoundary>
    </div>
  );
}
